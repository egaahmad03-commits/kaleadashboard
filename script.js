document.addEventListener('DOMContentLoaded', () => {
    
    // Smooth Scrolling untuk tombol "Tentang Kami"
    const btnAbout = document.getElementById('btn-about');
    
    btnAbout.addEventListener('click', (e) => {
        e.preventDefault(); 
        
        const targetId = btnAbout.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });

    // Efek Transisi Masuk (Fade-in-up) saat Page Load
    const elementsToAnimate = [
        '.profile-card',
        '.links-group',
        '.social-links',
        '.about-section',
        '.footer-section'
    ];

    elementsToAnimate.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 150 * (index + 1));
        }
    });
});
