document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Logika Navigasi Link Dashboard (Selalu jalan di halaman manapun)
    const linkCards = document.querySelectorAll('.link-card');
    linkCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url');
            if(url) window.location.href = url;
        });
    });

    // 2. Fungsi Slider (Hanya jalan jika elemen tersedia di halaman)
    function initSlider(containerId, wrapperId, dotsClass) {
        const container = document.getElementById(containerId);
        if (!container) return; // Keluar jika tidak ada slider di halaman ini

        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        const slides = wrapper.querySelectorAll('.slide, .slide-review');
        const dotsContainer = container.querySelector(dotsClass);
        if (!dotsContainer) return;

        let index = 0;

        // Auto-generate dots
        slides.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.addEventListener('click', () => { index = i; update(); });
            dotsContainer.appendChild(dot);
        });

        const dots = dotsContainer.querySelectorAll('.dot');
        
        function update() {
            wrapper.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
        }

        const prev = container.querySelector('.prev-btn');
        const next = container.querySelector('.next-btn');
        if (next) next.addEventListener('click', () => { index = (index + 1) % slides.length; update(); });
        if (prev) prev.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; update(); });

        update();
        setInterval(() => { index = (index + 1) % slides.length; update(); }, 6000);
    }

    // Inisialisasi slider (Akan terlewati otomatis jika ID tidak ditemukan)
    initSlider('projectSliderContainer', 'projectSlider', '.slider-dots');
    initSlider('reviewSliderContainer', 'reviewSlider', '.review-dots');
});

document.addEventListener('DOMContentLoaded', () => {
    
    function setupSlider(containerId, wrapperId, dotsClass, autoSlideInterval = 5000) {
        const container = document.getElementById(containerId);
        if (!container) return; 

        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return; 

        const slides = wrapper.querySelectorAll('.slide, .slide-review');
        if (slides.length === 0) return; 

        const dotsContainer = container.querySelector(dotsClass);
        let index = 0;
        let slideInterval;

        // Fungsi Update
        function update() {
            wrapper.style.transition = "transform 0.8s ease-in-out";
            wrapper.style.transform = `translateX(-${index * 100}%)`;
            
            if (dotsContainer) {
                const dots = dotsContainer.querySelectorAll('.dot');
                dots.forEach((d, i) => d.classList.toggle('active', i === index));
            }
        }

        // Buat dots
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            slides.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (i === 0) dot.classList.add('active');
                dot.addEventListener('click', () => { 
                    index = i; 
                    update(); 
                    resetInterval(); // Reset timer saat diklik
                });
                dotsContainer.appendChild(dot);
            });
        }

        // Navigasi manual
        const prev = container.querySelector('.prev-btn');
        const next = container.querySelector('.next-btn');
        
        if (next) {
            next.addEventListener('click', () => { 
                index = (index + 1) % slides.length; 
                update(); 
                resetInterval(); 
            });
        }
        
        if (prev) {
            prev.addEventListener('click', () => { 
                index = (index - 1 + slides.length) % slides.length; 
                update(); 
                resetInterval(); 
            });
        }

        // Auto-Slide Logic
        function startInterval() {
            slideInterval = setInterval(() => {
                index = (index + 1) % slides.length;
                update();
            }, autoSlideInterval);
        }

        function resetInterval() {
            clearInterval(slideInterval);
            startInterval();
        }

        // Jalankan
        startInterval();
    }

    // Inisialisasi untuk Project dan Review
    setupSlider('projectSliderContainer', 'projectSlider', '.slider-dots', 5000);
    setupSlider('reviewSliderContainer', 'reviewSlider', '.review-dots', 5000);
});