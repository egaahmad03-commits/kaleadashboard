document.addEventListener('DOMContentLoaded', () => {
    
    // ===================================================
    // 1. ANIMASI LOAD (Fade-In-Up)
    // ===================================================
    const elementsToAnimate = [
        '.profile-card', '.links-group', '.social-links',
        '.about-nav', '.about-main-card', '.footer-section'
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
            }, 120 * (index + 1));
        }
    });

    // ===================================================
    // 2. LOGIKA KONTROL SLIDER & AUTOPLAY DURATION
    // ===================================================
    const initSlider = (sliderId, prevBtnId, nextBtnId, dotsContainerId) => {
        const slider = document.getElementById(sliderId);
        const prevBtn = document.getElementById(prevBtnId);
        const nextBtn = document.getElementById(nextBtnId);
        const dotsContainer = document.getElementById(dotsContainerId);

        if (!slider) return;

        const dots = dotsContainer ? dotsContainer.querySelectorAll('.dot') : [];
        let timer = null;
        const duration = 5000; // Siklus berganti otomatis per 5 detik

        // Mendapatkan indeks aktif berdasar scroll
        const getActiveIndex = () => {
            const currentLeft = slider.scrollLeft;
            const itemWidth = slider.clientWidth;
            if (itemWidth === 0) return 0;
            return Math.round(currentLeft / itemWidth);
        };

        // Update status dot aktif
        const updateDots = (index) => {
            dots.forEach((dot, idx) => {
                if (idx === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };

        // Bergeser ke Kanan (Next)
        const goToNext = () => {
            const width = slider.clientWidth;
            const maxScroll = slider.scrollWidth - width;
            
            if (slider.scrollLeft >= maxScroll - 15) {
                slider.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                slider.scrollBy({ left: width, behavior: 'smooth' });
            }
        };

        // Bergeser ke Kiri (Prev)
        const goToPrev = () => {
            const width = slider.clientWidth;
            if (slider.scrollLeft <= 15) {
                slider.scrollTo({ left: slider.scrollWidth, behavior: 'smooth' });
            } else {
                slider.scrollBy({ left: -width, behavior: 'smooth' });
            }
        };

        const startSlider = () => {
            stopSlider();
            timer = setInterval(goToNext, duration);
        };

        const stopSlider = () => {
            if (timer) clearInterval(timer);
        };

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                goToNext();
                startSlider();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                goToPrev();
                startSlider();
            });
        }

        slider.addEventListener('scroll', () => {
            updateDots(getActiveIndex());
        });

        // UX: Jeda putaran otomatis sesaat saat user melakukan drag/swipe manual
        slider.addEventListener('touchstart', stopSlider, { passive: true });
        slider.addEventListener('touchend', startSlider, { passive: true });

        startSlider();
    };

    // Jalankan slider
    initSlider('projects-slider', 'project-prev', 'project-next', 'project-dots');
    initSlider('reviews-slider', 'review-prev', 'review-next', 'review-dots');
});