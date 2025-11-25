---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
title: CPP DiTTA Interactive Model
permalink: /
---

# CPP-DiTTA Interactive Model
Welcome to the interactive stress analysis model developed for the Digital Twin Technology for Aerospace (DiTTA) initiative at Cal Poly Pomona.

This tool demonstrates:
- **Predicting damage location** along a 24-inch beam using NN1  
- **Generating a full stress field** across ~40,000 nodes using NN3  
- **Real-time 3D visualization** through Unity (WebGL) and Bevy (WASM)


Input stress values for each node on the beam. These may range from 0 to 10,000 psi.

{% include inputs.html %}

<!-- Unity NN1 -->
{% include Unity_1.html %}

<!-- Unity NN3 -->
{% include Unity_2.html %}

