// Tunggu sampai HTML siap
window.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelector('.kf-projects-slider');
    const items = document.querySelectorAll('.kf-project-item');

    if (!slider) {
        console.log("Slider tidak ditemukan di halaman ini!");
        return;
    }

    let currentIndex = 0;

    function nextSlide() {
        currentIndex++;
        if (currentIndex >= items.length) {
            currentIndex = 0;
        }
        // Menggeser slider ke kiri
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    // Auto slide setiap 5 detik
    setInterval(nextSlide, 5000);
    console.log("Slider berhasil dimulai!");
});