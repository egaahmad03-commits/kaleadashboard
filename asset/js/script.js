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

  // Stagger all content as it enters the viewport, including async catalog/cart cards.
  var revealSelector = [
    '.why-us-item', '.about-story', '.about-stats .stat-card', '.about-testimonials', '.about-gallery',
    '.contact-card', '.contact-map-section', '.contact-form-section', '.room-card', '.product-card',
    '.product-list-card', '.product-detail-gallery', '.product-detail-info', '.cart-item', '.cart-empty',
    '.room-back-bottom-wrap'
  ].join(', ');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealIndex = 0;
  var productRevealIndex = 0;
  var revealObserver = !reducedMotion && 'IntersectionObserver' in window ? new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }) : null;

  function prepareReveal(root) {
    if (!root || root.nodeType !== 1) return;
    var items = [];
    if (root.matches && root.matches(revealSelector)) items.push(root);
    if (root.querySelectorAll) items = items.concat(Array.prototype.slice.call(root.querySelectorAll(revealSelector)));

    items.forEach(function (item) {
      if (item.classList.contains('reveal-on-scroll')) return;
      item.classList.add('reveal-on-scroll');
      var isProductTile = item.matches('.product-card, .product-list-card');
      var delay = isProductTile ? (productRevealIndex++ % 6) * 240 : (revealIndex++ % 4) * 90;
      item.style.setProperty('--reveal-delay', delay + 'ms');
      if (reducedMotion || !revealObserver) item.classList.add('is-visible');
      else revealObserver.observe(item);
    });
  }

  prepareReveal(document.body);

  if (revealObserver && 'MutationObserver' in window) {
    var contentObserver = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) { prepareReveal(node); });
      });
    });
    contentObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Re-run the catalog hero reveal whenever a room filter swaps its background.
  var catalogHero = document.querySelector('.catalog-hero');
  if (catalogHero && 'MutationObserver' in window) {
    var roomHeroObserver = new MutationObserver(function () {
      catalogHero.classList.remove('catalog-hero-reenter');
      void catalogHero.offsetWidth;
      catalogHero.classList.add('catalog-hero-reenter');

      var catalogCopy = catalogHero.querySelector('.catalog-hero-content');
      if (catalogCopy) {
        catalogCopy.classList.add('catalog-copy-reset');
        void catalogCopy.offsetWidth;
        catalogCopy.classList.remove('catalog-copy-reset');
      }
    });
    roomHeroObserver.observe(catalogHero, { attributes: true, attributeFilter: ['data-room'] });
  }

});
