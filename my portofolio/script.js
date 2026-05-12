// 1. التبديل بين المشاريع + سكرول تلقائي للمشروع المختار
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

    // سكرول للمشاريع
    selectedProject.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 2. كود الكتابة المتحركة
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

// 3. Smooth Scroll للينكات الـ Navbar
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        document.querySelector(targetId).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// 4. كود الـ Download (مبني على الـ HTML)
document.getElementById('downloadCvBtn').addEventListener('click', function() {
    console.log("Downloading CV from: C:/Users/negad/Downloads/Resume.pdf");
});