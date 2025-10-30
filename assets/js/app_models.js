// Copied and adapted app_models.js to new assets path
window.NN1 = null;
window.NN1Ready = (async () => {
  const gm = await tf.loadGraphModel("./models/tfjs_NN1/model.json");
  const inName = Object.keys(gm.signature.inputs)[0];
  window.NN1 = { gm, inName };
})();

window.predictNN1 = async function (x7) {
  if (!Array.isArray(x7) || x7.length !== 7) throw new Error("need 7 numbers");
  await window.NN1Ready;
  const xs  = tf.tensor2d([x7], [1,7], "float32");
  const out = NN1.gm.execute({ [NN1.inName]: xs });
  const v   = (await out.data())[0];
  xs.dispose(); out.dispose();
  return v;
};
