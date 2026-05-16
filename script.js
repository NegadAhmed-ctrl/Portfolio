// 1. Project tab switching
function openProject(evt, projectName) {
    var i, projectContent, projBtn;

    projectContent = document.getElementsByClassName("project-content");
    for (i = 0; i < projectContent.length; i++) {
        projectContent[i].style.display = "none";
        projectContent[i].classList.remove("active");
    }

    projBtn = document.getElementsByClassName("proj-btn");
    for (i = 0; i < projBtn.length; i++) {
        projBtn[i].className = projBtn[i].className.replace(" active", "");
    }

    const selectedProject = document.getElementById(projectName);
    selectedProject.style.display = "block";
    selectedProject.classList.add("active");
    evt.currentTarget.className += " active";

    selectedProject.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 2. Typed.js animation
const typed = new Typed('.multiple-text', {
    strings: [
        'Flutter Developer',
        'Data Science Specialist',
        'Mobile App Architect',
        'Computing Student'
    ],
    typeSpeed: 70,
    backSpeed: 70,
    backDelay: 1000,
    loop: true
});

// 3. Smooth scroll for navbar links (also closes mobile menu)
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        document.querySelector(targetId).scrollIntoView({ behavior: 'smooth' });
        // Close mobile menu after click
        document.getElementById('navbar').classList.remove('open');
        hamburgerIcon.className = 'bx bx-menu';
    });
});

// 4. Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const navbar = document.getElementById('navbar');
const hamburgerIcon = hamburger.querySelector('i');

hamburger.addEventListener('click', () => {
    navbar.classList.toggle('open');
    hamburgerIcon.className = navbar.classList.contains('open') ? 'bx bx-x' : 'bx bx-menu';
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navbar.contains(e.target)) {
        navbar.classList.remove('open');
        hamburgerIcon.className = 'bx bx-menu';
    }
});
