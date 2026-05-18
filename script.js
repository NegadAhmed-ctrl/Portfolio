// ============================================================
// EmailJS Contact Form
// ============================================================
// STEP 1: Replace these 3 values with yours from emailjs.com
const EMAILJS_PUBLIC_KEY   = "BUh86D_1FbdIOs7H2";
const EMAILJS_SERVICE_ID   = "service_wkz7ui5";
const EMAILJS_TEMPLATE_ID  = "template_67do1sj";
// ============================================================

(function () {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
})();

document.querySelector('.contact form').addEventListener('submit', function (e) {
    e.preventDefault();

    const nameInput    = this.querySelector('input[type="text"]');
    const emailInput   = this.querySelector('input[type="email"]');
    const messageInput = this.querySelector('textarea');
    const submitBtn    = this.querySelector('input[type="submit"]');

    // Basic validation
    if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
        showToast('❗ Please fill in all fields.', 'error');
        return;
    }

    submitBtn.value    = 'Sending...';
    submitBtn.disabled = true;

    const templateParams = {
        from_name:    nameInput.value.trim(),
        from_email:   emailInput.value.trim(),
        message:      messageInput.value.trim(),
        to_name:      'Negad Ahmed',
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => {
            showToast('✅ Message sent! I\'ll get back to you soon.', 'success');
            nameInput.value    = '';
            emailInput.value   = '';
            messageInput.value = '';
        })
        .catch((err) => {
            console.error('EmailJS error:', err);
            showToast('❌ Something went wrong. Please try again.', 'error');
        })
        .finally(() => {
            submitBtn.value    = 'Send Message';
            submitBtn.disabled = false;
        });
});

function showToast(message, type) {
    // Remove existing toast if any
    const existing = document.getElementById('toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#00c896' : '#ff4d6d'};
        color: #fff;
        padding: 14px 28px;
        border-radius: 50px;
        font-size: 1rem;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.4s ease;
    `;
    document.body.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => { toast.style.opacity = '1'; });

    // Fade out after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

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
