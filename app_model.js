let NN1=null;

async function loadNN1(){
  const base="models/tfjs_NN1/";
  const [model,scaler]=await Promise.all([
    tf.loadLayersModel(base+"model.json"),
    fetch(base+"scaler.json").then(r=>r.json())
  ]);
  NN1={model,scaler};
}
function scaleStd(x,sc){ return x.map((v,i)=>(v-sc.mean[i])/sc.scale[i]); }
async function predictNN1(x){
  const xs=tf.tensor2d([scaleStd(x,NN1.scaler)]);
  const y=NN1.model.predict(xs);
  const v=(await y.data())[0];
  xs.dispose(); y.dispose(); return v;
}
window.addEventListener("DOMContentLoaded", loadNN1);