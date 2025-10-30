// UI glue (moved into assets/js/)
function adjustInput(id, inc) {
    const el = document.getElementById(id);
    const v = (parseFloat(el.value) || 0) + inc;
    el.value = Math.min(20000, Math.max(0, v));
}

function setCase(values) {
    values.forEach((v, i) => {
        const el = document.getElementById(`input${i + 1}`);
        if (el) el.value = v;
    });
}

async function onSubmitForm(e) {
    e.preventDefault();
    await NN1Ready;
    const vals = [...new FormData(e.target).values()].map(Number);
    const y = await window.predictNN1(vals);
    const cut = y.toFixed(2);
    // Match the result fragment styling used by server templates
    document.getElementById("ml-result-container").innerHTML =
        `<div class="alert alert-info text-center my-4"><h3>Predicted Cut Location: ${cut} inches</h3></div>\n\n<!-- Store cut for JavaScript -->\n<div id="predicted-cut" data-prediction="${cut}" style="display:none;"></div>`;
    if (window.unityInstance) window.unityInstance.SendMessage("CutPositionManager", "ReceivePrediction", cut);
}

// Single, global entrypoint to run the first model from other scripts or the console
window.runPredictForm = async function () {
    await NN1Ready;
    const vals = [...document.querySelectorAll('#predict-form input[type=number]')].map(i => Number(i.value || 0));
    const y = await window.predictNN1(vals);
    const cut = y.toFixed(2);
    document.getElementById("ml-result-container").innerHTML =
        `<div class="alert alert-info text-center my-4"><h3>Predicted Cut Location: ${cut} inches</h3></div>\n\n<!-- Store cut for JavaScript -->\n<div id="predicted-cut" data-prediction="${cut}" style="display:none;"></div>`;
    if (window.unityInstance) window.unityInstance.SendMessage("CutPositionManager", "ReceivePrediction", cut);
};

function runNN2() {
    const cutEl = document.getElementById('predicted-cut');
    const cutValue = cutEl ? cutEl.getAttribute('data-prediction') : '12.3';
    if (window.unityInstance2) {
        const data = []; // placeholder
        window.unityInstance2.SendMessage('WebDataReceiver', 'ReceiveStressData', JSON.stringify(data));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('predict-form')?.addEventListener('submit', onSubmitForm);
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        // start disabled until model loaded
        runBtn.disabled = true;
        // enable when model is ready
        window.NN1Ready.then(() => { runBtn.disabled = false; });
        runBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            await window.runPredictForm();
        });
    }
});
