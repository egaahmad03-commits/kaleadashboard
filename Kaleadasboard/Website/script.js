document.addEventListener('DOMContentLoaded', () => {
    // Navigasi Link Dashboard
    document.querySelectorAll('.link-card').forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url');
            if(url) window.location.href = url;
        });
    });

    // Setup Slider (Jika ada container slider)
    function setupSlider(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const wrapper = container.querySelector('.slider-wrapper');
        const slides = container.querySelectorAll('.slide');
        const dotsContainer = container.querySelector('.slider-dots');
        const prevBtn = container.querySelector('.prev-btn');
        const nextBtn = container.querySelector('.next-btn');
        
        let index = 0;
        const total = slides.length;

        slides.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        });

        const dots = container.querySelectorAll('.dot');
        function updateUI() {
            wrapper.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        }

        function goToSlide(newIndex) { index = newIndex; updateUI(); }
        function nextSlide() { index = (index + 1) % total; updateUI(); }
        function prevSlide() { index = (index - 1 + total) % total; updateUI(); }

        let autoSlide = setInterval(nextSlide, 5000);

        nextBtn.addEventListener('click', () => { nextSlide(); clearInterval(autoSlide); autoSlide = setInterval(nextSlide, 5000); });
        prevBtn.addEventListener('click', () => { prevSlide(); clearInterval(autoSlide); autoSlide = setInterval(nextSlide, 5000); });
    }

    setupSlider('projectSliderContainer');
});

/bagian 2 jss porto 

document.addEventListener('DOMContentLoaded', () => {
    
    function initSlider(containerId, wrapperId, dotsClass) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const wrapper = document.getElementById(wrapperId);
        const slides = wrapper.querySelectorAll('.slide, .slide-review');
        const dotsContainer = container.querySelector(dotsClass);
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

        // Logic Nav (Jika ada tombol prev/next)
        const prev = container.querySelector('.prev-btn');
        const next = container.querySelector('.next-btn');
        if (next) next.addEventListener('click', () => { index = (index + 1) % slides.length; update(); });
        if (prev) prev.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; update(); });

        update();
        setInterval(() => { index = (index + 1) % slides.length; update(); }, 6000);
    }

    // Initialize both sliders
    initSlider('projectSliderContainer', 'projectSlider', '.slider-dots');
    initSlider('reviewSliderContainer', 'reviewSlider', '.review-dots');
});