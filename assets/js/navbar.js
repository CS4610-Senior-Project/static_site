document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("navbar-toggle");
    const links = document.getElementById("navbar-links");

    toggle?.addEventListener("click", () => {
        links.classList.toggle("open");
    });
});
