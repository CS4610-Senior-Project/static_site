---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
title: CPP DiTTA Interactive Model
permalink: /
---

# CPP-DiTTA Interactive Model
## Step 1 - Predicting Damage Location
First, seven sensors are used to read stress values along the length of the 24-inch beam. The values of these sensors will give insight into the location of any damage along the beam, if any.

Input stress values for each node on the beam. These may range from 0 to 10,000 psi.

{% include inputs.html %}

<!-- Unity NN1 -->
{% include Unity_1.html %}

<!-- Unity NN3 -->
{% include Unity_2.html %}

