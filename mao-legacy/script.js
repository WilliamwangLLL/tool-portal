let currentLang = 'zh';

function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    
    // Update button text
    const button = document.querySelector('.lang-toggle');
    button.textContent = currentLang === 'zh' ? 'EN' : '中文';
    
    // Update all elements with data-zh and data-en attributes
    const elements = document.querySelectorAll('[data-zh][data-en]');
    elements.forEach(el => {
        const text = currentLang === 'zh' ? el.getAttribute('data-zh') : el.getAttribute('data-en');
        el.textContent = text;
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add fade-in animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all major sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Initialize first section as visible
document.querySelector('.hero').style.opacity = '1';
document.querySelector('.hero').style.transform = 'translateY(0)';