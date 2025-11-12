let nn3Session = null;
let scalerX = null;
let scalerY = null;

window.addEventListener("DOMContentLoaded", async () => {
  await loadUnityNN2();
});


// Load NN3 model
async function loadNN3() {
if (nn3Session) return nn3Session;
console.log("Loading NN3 model...");
nn3Session = await ort.InferenceSession.create('/assets/ONNX/NN3.onnx');
console.log("NN3 model loaded.");
return nn3Session;
}

// Load normalization scalers
async function loadNN3Scalers() {
if (scalerX && scalerY) return { scalerX, scalerY };

const [resX, resY] = await Promise.all([
    fetch('/assets/ONNX/scaler_X_nn3_noEng.json').then(r => r.json()),
    fetch('/assets/ONNX/scaler_y_nn3_noEng.json').then(r => r.json())
]);

scalerX = resX;
scalerY = resY;
console.log("NN3 scalers loaded:", scalerX, scalerY);
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
// put your CSV in: static/data/Node_Cords_40k.csv
const res = await fetch('/_data/Node_Cords_40k.csv');
if (!res.ok) throw new Error('Failed to fetch Node_Cords_40k.csv');
const text = await res.text();
return text;
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

async function runNN3() {
const result = document.getElementById("ml-result-container").dataset.prediction || "unknown";
    if (result === "unknown") {
    alert("Please run the machine learning model first.");
    return;
    }

    const cutLocation = parseFloat(result);
    const forceValue  = 2.5; // TODO: wire a UI control if you want this adjustable

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
        inputArr[ptr++] = normMinMax(forceValue,  scalerX.min_, scalerX.scale_, 4);
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

    // Yield to the browser so the page stays responsive
    await new Promise(requestAnimationFrame);
    }

    console.timeEnd("NN3-grid-inference");
    console.log(`Predicted ${points.length} stresses.`);

    // 4) Send to Unity
    const jsonData = JSON.stringify(points);
    if (window.unityInstance2) {
    console.log("Sending stress field JSON to Unity:", (jsonData.length/1024/1024).toFixed(2), "MB");
    window.unityInstance2.SendMessage("WebDataReceiver", "ReceiveStressData", jsonData);
    } else {
    console.warn("Unity instance 2 not ready yet");
    }
}



async function loadUnityNN2() {
const script = document.createElement("script");
script.src = "/assets/models/UnityBuild_NN2/WebGL_NN2_Build2.loader.js";
document.body.appendChild(script);
await new Promise(res => (script.onload = res));

const buildUrl = "/asset/models/UnityBuild_NN2";
const config = {
dataUrl: buildUrl + "/WebGL_NN2_Build2.data",
frameworkUrl: buildUrl + "/WebGL_NN2_Build2.framework.js",
codeUrl: buildUrl + "/WebGL_NN2_Build2.wasm",
streamingAssetsUrl: "StreamingAssets",
companyName: "CPP",
productName: "DiTTA NN2",
productVersion: "1.0",
};

const canvas = document.getElementById("unityContainer2");
return createUnityInstance(canvas, config, (p) => {
console.log(`NN2 loading: ${Math.round(p * 100)}%`);
}).then((unityInstance) => {
window.unityInstance2 = unityInstance;
console.log("NN2 Unity initialized!");
}).catch((err) => console.error("NN2 failed:", err));
}

