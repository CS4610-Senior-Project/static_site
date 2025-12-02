---
layout: default
title: Contributors
permalink: /contributors/
---

# Project Contributors
A list of the students, faculty, collaborators, and researchers involved.

## Faculty Advisors
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
