  let nn1Session = null;
  let nn1Scaler = null;

window.addEventListener("DOMContentLoaded", async () => {
  await loadUnityNN1();
});

  // Load ONNX model once
  async function loadNN1() {
    if (nn1Session) return nn1Session;
    console.log("Loading NN1 model...");
    nn1Session = await ort.InferenceSession.create('/assets/ONNX/NN1_trained_model.onnx');
    console.log("NN1 model loaded.");
    return nn1Session;
  }

  // Load the StandardScaler parameters (mean & scale)
  async function loadScaler() {
    if (nn1Scaler) return nn1Scaler;
    const res = await fetch('/assets/ONNX/NN1_scaler.json');
    nn1Scaler = await res.json();
    console.log("Scaler loaded:", nn1Scaler);
    return nn1Scaler;
  }

  // Run NN1 inference
  async function runNN1Prediction() {
    const session = await loadNN1();
    const scaler = await loadScaler();

    // collect user inputs
    const inputs = [];
    for (let i = 1; i <= 7; i++) {
      inputs.push(parseFloat(document.getElementById(`input${i}`).value) || 0);
    }

    // apply StandardScaler: (x - mean) / scale
    const scaled = inputs.map((x, i) => (x - scaler.mean[i]) / scaler.scale[i]);

    // create tensor [1,7]
    const inputTensor = new ort.Tensor('float32', Float32Array.from(scaled), [1, 7]);

    // feed dictionary — adjust key if ONNX input name differs
    const feeds = { [session.inputNames[0]]: inputTensor };

    
    document.getElementById("ml-result-container").innerHTML = `<div class="spinner-border text-primary" role="status"><span class="sr-only">Running...</span></div>`;


    // run inference
    const results = await session.run(feeds);
    const outputName = Object.keys(results)[0];
    const yPred = results[outputName].data[0];

    displayPrediction(yPred);
  }

  function displayPrediction(yPred) {
    const result = yPred.toFixed(2);
    document.getElementById("ml-result-container").innerHTML =
      `<div class="alert alert-info"><h3>Predicted Cut Location: ${result} inches</h3></div>`;
    document.getElementById("ml-result-container").dataset.prediction = result;

    // --- NEW: Send to Unity (Scene 1 visualization)
    if (window.unityInstance1) {
      console.log("Sending cut location to Unity:", result);
      window.unityInstance1.SendMessage("CutPositionManager", "ReceivePrediction", result);
    } else {
      console.warn("Unity instance not ready yet");
    }
  }
async function loadUnityNN1() {
  const script = document.createElement("script");
  script.src = "/assets/models/UnityBuild_NN1/WebGL_NN1_Build4.loader.js";
  document.body.appendChild(script);
  await new Promise(res => (script.onload = res));

  const buildUrl = "/assets/models/UnityBuild_NN1";
  const config = {
    dataUrl: buildUrl + "/WebGL_NN1_Build4.data",
    frameworkUrl: buildUrl + "/WebGL_NN1_Build4.framework.js",
    codeUrl: buildUrl + "/WebGL_NN1_Build4.wasm",
    streamingAssetsUrl: "StreamingAssets",
    companyName: "CPP",
    productName: "DiTTA NN1",
    productVersion: "1.0",
  };

  const canvas = document.getElementById("unityContainer");
  return createUnityInstance(canvas, config, (p) => {
    console.log(`NN1 loading: ${Math.round(p * 100)}%`);
  }).then((unityInstance) => {
    window.unityInstance1 = unityInstance;
    console.log("NN1 Unity initialized!");
  }).catch((err) => console.error("NN1 failed:", err));
}

