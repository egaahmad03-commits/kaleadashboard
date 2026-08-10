document.addEventListener('DOMContentLoaded', function () {

  // Isi tahun copyright secara otomatis di footer
  var yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ===== Toggle menu navigasi (mobile) =====
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Tutup menu otomatis saat salah satu link diklik (khusus mobile)
    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ===== Form kontak -> kirim via WhatsApp =====
  var contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var nama = document.getElementById('cfNama').value.trim();
      var kontakUser = document.getElementById('cfKontak').value.trim();
      var pesan = document.getElementById('cfPesan').value.trim();

      var teks = 'Halo Kalea Furniture, saya ' + nama +
        ' (' + kontakUser + '). ' + pesan;

      var url = 'https://wa.me/6289504977797?text=' + encodeURIComponent(teks);
      window.open(url, '_blank', 'noopener');
    });
  }

});
