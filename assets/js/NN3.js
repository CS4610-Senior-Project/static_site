---
---
const NN3_URL       = "{{ '/assets/ONNX/NN3.onnx' | relative_url }}";
const SCALER_X_URL  = "{{ '/assets/ONNX/scaler_X_nn3_noEng.json' | relative_url }}";
const SCALER_Y_URL  = "{{ '/assets/ONNX/scaler_y_nn3_noEng.json' | relative_url }}";
const NODE_CSV_URL  = "{{ '/assets/Node_Cords_40k.csv' | relative_url }}";


let nn3Session = null;
let scalerX = null;
let scalerY = null;
let lastPoints = null;
const waitBevy = () => new Promise(r => {
  const id = setInterval(() => {
    const b = window.__bevy || window.wasm || window.wasm_bindgen;
    if (b?.bevy_receive_stress_json) { clearInterval(id); r(b); }
  }, 50);
});

// Load NN3 model
async function loadNN3() {
    if (nn3Session) return nn3Session;
    console.log("Loading NN3 model...");
    nn3Session = await ort.InferenceSession.create(NN3_URL);
    console.log("NN3 model loaded.");
    return nn3Session;
}

// Load normalization scalers
async function loadNN3Scalers() {
  if (scalerX && scalerY) return { scalerX, scalerY };
  const [resX, resY] = await Promise.all([
    fetch(SCALER_X_URL).then(r => r.json()),
    fetch(SCALER_Y_URL).then(r => r.json())
  ]);
  scalerX = resX; scalerY = resY;
  return { scalerX, scalerY };
}

// Normalization helpers
function normalizeInput(val, idx) {
    // Handles either min_/max_ or scale_ depending on sklearn type
    if (scalerX.min_) {
        // If using MinMaxScaler
        const min = scalerX.data_min_[idx];
        const max = scalerX.data_max_[idx];
        return (val - min) / (max - min);
    } else if (scalerX.scale_) {
        // If using StandardScaler (mean/std)
        const mean = scalerX.mean_[idx];
        const scale = scalerX.scale_[idx];
        return (val - mean) / scale;
    } else {
        console.warn("Unknown scaler format for X:", scalerX);
        return val;
    }
}

function denormalizeOutput(val, idx = 0) {
    // Handles either min_/max_ or scale_ for Y scaler
    if (scalerY.data_min_) {
        const min = scalerY.data_min_[idx];
        const max = scalerY.data_max_[idx];
        return val * (max - min) + min;
    } else if (scalerY.scale_) {
        const mean = scalerY.mean_[idx];
        const scale = scalerY.scale_[idx];
        return val * scale + mean;
    } else {
        console.warn("Unknown scaler format for Y:", scalerY);
        return val;
    }
}

async function fetchNodeCSV() {
  const res = await fetch(NODE_CSV_URL);
  if (!res.ok) throw new Error('Failed to fetch Node_Cords_40k.csv');
  return res.text();
}

function parseNodeCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    // expected header: Node Number,X Location (in),Y Location (in),Z Location (in)
    const startIdx = 1; // skip header line
    const nodes = [];
    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 4) continue;
        // parts[0]=Node Number (ignored)
        const x = parseFloat(parts[1]);   // X Location (in)
        const y = parseFloat(parts[2]);   // Y Location (in)
        const z = parseFloat(parts[3]);   // Z Location (in)
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            nodes.push({ x, y, z });
        }
    }
    return nodes;
}

// Normalization / Denormalization helpers for MinMaxScaler
function normMinMax(val, minArr, scaleArr, idx) {
    // Convert raw input → normalized value in [0,1]
    return val * scaleArr[idx] + minArr[idx];
}

function invMinMax(val, minArr, scaleArr, idx) {
    // Convert normalized value → back to original (psi, etc.)
    return (val - minArr[idx]) / scaleArr[idx];
}

async function runNN3WithForce(forceValue) {
    showLoading(); 
    const result = document.getElementById("ml-result-container").dataset.prediction || "unknown";
    if (result === "unknown") {
        alert("Please run the machine learning model first.");
        return;
    }

    const cutLocation = parseFloat(result);
    // const forceValue = 2.5;

    // 1) Load model + scalers
    const [session, scalers] = await Promise.all([loadNN3(), loadNN3Scalers()]);
    const { scalerX, scalerY } = scalers;

    // 2) Fetch and parse your CSV grid (≈40k nodes)
    console.log("Fetching node grid CSV...");
    const csvText = await fetchNodeCSV();
    const nodes = parseNodeCSV(csvText);
    console.log(`Parsed ${nodes.length} nodes from CSV.`);

    // 3) Batch over nodes
    // ONNX usually expects [N,5], but many training exports still want [1,5].
    // We'll do micro-batches of size BATCH (tune for perf/memory).
    const BATCH = 1024; // try 2048 on desktop if perf is fine
    const points = [];
    console.time("NN3-grid-inference");

    for (let start = 0; start < nodes.length; start += BATCH) {
        const end = Math.min(start + BATCH, nodes.length);
        const batchSize = end - start;

        // Build [batchSize, 5] input: (x,y,z,cut,force) — all normalized
        const inputArr = new Float32Array(batchSize * 5);
        let ptr = 0;
        for (let i = start; i < end; i++) {
            const { x, y, z } = nodes[i];
            inputArr[ptr++] = normMinMax(x, scalerX.min_, scalerX.scale_, 0);
            inputArr[ptr++] = normMinMax(y, scalerX.min_, scalerX.scale_, 1);
            inputArr[ptr++] = normMinMax(z, scalerX.min_, scalerX.scale_, 2);
            inputArr[ptr++] = normMinMax(cutLocation, scalerX.min_, scalerX.scale_, 3);
            inputArr[ptr++] = normMinMax(forceValue, scalerX.min_, scalerX.scale_, 4);
        }

        // If your NN3 takes [batch,5], use shape [batchSize,5]; if it takes [1,5], loop each row instead.
        const inputTensor = new ort.Tensor('float32', inputArr, [batchSize, 5]);
        const feeds = { [session.inputNames[0]]: inputTensor };
        const outputs = await session.run(feeds);
        const outName = Object.keys(outputs)[0];
        const out = outputs[outName].data; // length = batchSize

        // Denormalize each stress and push the point back
        for (let j = 0; j < batchSize; j++) {
            const node = nodes[start + j];
            const stressNorm = out[j];
            const stress = invMinMax(stressNorm, scalerY.min_, scalerY.scale_, 0);
            points.push({ x: node.x, y: node.y, z: node.z, stress });
        }

        if (start === 0 || (start / BATCH) % 10 === 0) {
            console.log(`NN3 progress: ${end}/${nodes.length} (${Math.round(100 * end / nodes.length)}%)`);
        }

        
        
    }

    // 4) Send to Unity


const payload = JSON.stringify(points);
const bevy = (window.__bevy || window.wasm || window.wasm_bindgen) ?? await waitBevy();
bevy.bevy_receive_stress_json(payload, null);
hideLoading(); 

}

// Step 2 (hardcoded 2.5 lbs)
// User is not allowed to change force at this step
async function runNN3Step2() {
    await runNN3WithForce(2.5);
}

// Step 3 (custom force via UI input)
// User is now allowed to change force and rerun the second Bevy window
async function runNN3Step3() {
    const inputElem  = document.getElementById("force-input");
    const sliderElem = document.getElementById("force-slider");

    // Prefer the slider’s value if moved, otherwise the text input
    let val = parseFloat(sliderElem?.value ?? inputElem.value);

    // If slider value is NaN (should not happen), fallback to input
    if (isNaN(val)) val = parseFloat(inputElem.value);

    // Validate again
    if (isNaN(val)) {
        alert("Please enter or select a valid force value.");
        return;
    }

    // Clamp to the allowed range
    val = Math.min(15, Math.max(2, val));

    await runNN3WithForce(val);
}


