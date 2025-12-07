---
layout: default
title: Contributors
permalink: /contributors/
---

# DiTTA Contributors

---

## Director
<div class="contributors-grid">
  {% for person in site.data.contributors.director %}
    {% include contributor_card.html 
        name=person.name 
        role=person.role 
        email=person.email 
        image=person.image 
        link=person.link
    %}
  {% endfor %}
</div>

---

## Faculty Contributors
<div class="contributors-grid">
  {% for person in site.data.contributors.faculty %}
    {% include contributor_card.html 
        name=person.name 
        role=person.role 
        email=person.email 
        image=person.image 
        link=person.link
    %}
  {% endfor %}
</div>

---

## Student Development Team
<div class="contributors-grid">
  {% for person in site.data.contributors.students %}
    {% include contributor_card.html 
        name=person.name 
        role=person.role 
        email=person.email 
        image=person.image 
        link=person.link
    %}
  {% endfor %}
</div>

---

## Other DiTTA Members
<div class="contributors-grid">
  {% for person in site.data.contributors.other_members %}
    {% include contributor_card.html 
        name=person.name 
        role=person.role 
        email=person.email 
        image=person.image 
        link=person.link
    %}
  {% endfor %}
</div>
