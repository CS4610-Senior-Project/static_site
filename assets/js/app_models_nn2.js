// TFJS loader for NN2
window.NN2 = null;
window.NN2Ready = (async () => {
  const gm = await tf.loadGraphModel("./models/tfjs_NN2/model.json");
  const inName = Object.keys(gm.signature.inputs)[0];
  window.NN2 = { gm, inName };
})();

window.predictNN2 = async function (xN) {
  if (!Array.isArray(xN)) throw new Error("need array");
  await window.NN2Ready;
  const xs  = tf.tensor2d([xN], [1,xN.length], "float32");
  const out = NN2.gm.execute({ [NN2.inName]: xs });
  const v   = (await out.data());
  xs.dispose(); out.dispose();
  return v;
};
