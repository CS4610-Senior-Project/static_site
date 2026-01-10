---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
title: CPP DiTTA Interactive Model
permalink: /
---

{% include loading_box.html %}

# CPP-DiTTA Interactive Model

Welcome to the interactive model developed for CPP-DiTTA (Digital Twin Technology for Aerospace) at Cal Poly Pomona.

This interactive tool is powered by two neural networks trained on simulated stress profiles generated from a 24-inch beam outfitted with force sensors. 

With this interface, users can input stress readings from seven virtual sensors to estimate where damage may be located along the beam. The first model (NN1) predicts the most likely cut position based solely on the stress signature. 

By adjusting sensor values and interacting with the 3D visualization, users can explore how machine learning interprets structural behaviors.

The goal of this model is to predict the location of a cut in the beam using Von-Mises stress values from seven sensors that line the bottom face of the beam. The cut location is then passed to the second model for further visualization.

The model was trained using a dataset of 81 cut location scenarios and their related stress readings at each node.

# Step 1: Predicting Damage

Input stress values for each node on the beam. These may range from 0 to 10,000 psi.

{% include inputs.html %}

<!-- Unity NN1 -->
{% include Unity_1.html %}

# Step 2: Generating Stress Field

The second model is designed to predict the von Mises stress at any point within the beam, given its spatial coordinates and the applied load conditions. Unlike the previous neural network used for predicting cut locations, this model focuses on learning the stress field response of the structure under varying force scenarios.

To train this model, a comprehensive dataset of ANSYS finite element simulations was used. Each simulation represents a different cut location and applied load case, capturing the resulting stress distribution across the beam. The complete dataset consists of 481 simulation files, for a total of nearly 19,630,227 data points

<!-- Unity NN3 -->
{% include Unity_2.html %}

<img src="{{ '/assets/img/psi_gradient.png' | relative_url }}" alt="Von Mises stress (psi) color gradient" style="display:block; max-width:500px; width:100%; height:auto; margin:16px auto;">

# Step 3: Adjusting Applied Force 

The Stress Field in Step 2 was generated under a load contition of 2.5lbs. Now, enter a custom value (in lbs) to see the difference in strain on the beam, given the damage.

{% include step_3_varforce.html %}

<script>
(function () {
  const box = document.createElement("pre");
  box.id = "mobile-log";
  box.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;max-height:50vh;overflow:auto;z-index:999999;" +
    "background:rgba(0,0,0,.88);color:#0f0;padding:10px;font:12px/1.4 monospace;white-space:pre-wrap;";
  box.textContent = "Mobile log:\n";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(box));

  const log = (...a) => { box.textContent += a.join(" ") + "\n"; };

  window.addEventListener("error", (e) =>
    log("ERROR:", e.message, e.filename || "", "line", e.lineno || "")
  );
  window.addEventListener("unhandledrejection", (e) =>
    log("PROMISE:", (e.reason && e.reason.message) || e.reason)
  );

  window.addEventListener("load", () => {
    log("UA:", navigator.userAgent);
    const c = document.querySelector("canvas#bevy");
    log("canvas#bevy:", c ? "found" : "NOT FOUND");
    if (!c) return;
    const gl2 = c.getContext("webgl2");
    const gl1 = c.getContext("webgl");
    log("WebGL:", gl2 ? "webgl2" : gl1 ? "webgl1" : "none");
    const r = c.getBoundingClientRect();
    log("CSS size:", Math.round(r.width) + "x" + Math.round(r.height));
    log("Attr size:", c.width + "x" + c.height);
  });
})();
</script>
