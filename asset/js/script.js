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

  // Elemen muncul bergiliran saat masuk layar, termasuk kartu yang dimuat belakangan dari Supabase.
  var revealSelector = [
    '.why-us-item', '.stat-card', '.vm-card', '.contact-card', '.contact-map-section',
    '.room-card', '.product-card', '.product-list-card', '.product-detail-gallery',
    '.product-detail-info', '.cart-item', '.cart-empty'
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
      var delay = isProductTile ? (productRevealIndex++ % 4) * 90 : (revealIndex++ % 4) * 90;
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

  // ===== Tema editorial =====

  // Header transparan di atas hero berubah putih setelah halaman di-scroll.
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    var updateHeader = function () {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  // Judul raksasa di hero dibuat pas selebar layar.
  // data-fit="desktop": di HP judul boleh turun baris dan memakai ukuran dari CSS.
  var fitTargets = document.querySelectorAll('[data-fit]');
  function fitText() {
    var narrow = window.matchMedia('(max-width: 768px)').matches;
    fitTargets.forEach(function (el) {
      if (narrow && el.getAttribute('data-fit') === 'desktop') { el.style.fontSize = ''; return; }
      var parentStyle = window.getComputedStyle(el.parentElement);
      var available = el.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);
      if (!available) return;
      el.style.fontSize = '100px';
      el.style.width = 'max-content';
      var natural = el.getBoundingClientRect().width;
      el.style.width = '';
      if (natural) el.style.fontSize = Math.min(100 * available / natural * 0.995, 260) + 'px';
    });
  }
  if (fitTargets.length) {
    fitText();
    window.addEventListener('resize', fitText);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);
    // Judul katalog berganti saat ruangan dipilih; ukur ulang setiap teksnya berubah.
    if ('MutationObserver' in window) {
      var fitObserver = new MutationObserver(fitText);
      fitTargets.forEach(function (el) { fitObserver.observe(el, { childList: true, characterData: true, subtree: true }); });
    }
  }

  // Judul besar muncul kata demi kata; label [kurung] terbuka setelahnya.
  function splitWords(root) {
    var index = 0;
    Array.prototype.slice.call(root.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { fragment.appendChild(document.createTextNode(' ')); return; }
          var outer = document.createElement('span');
          var inner = document.createElement('span');
          outer.className = 'w';
          outer.style.setProperty('--i', index++);
          inner.textContent = part;
          outer.appendChild(inner);
          fragment.appendChild(outer);
        });
        root.replaceChild(fragment, node);
      } else if (node.nodeType === 1) {
        node.style.setProperty('--i', index++);
      }
    });

    // Label [kurung] selalu menempel pada kata sebelumnya, tidak turun sendirian ke baris baru.
    root.querySelectorAll('.tag').forEach(function (tag) {
      var space = tag.previousSibling;
      var word = space && space.previousSibling;
      if (!word || word.nodeType !== 1 || !word.classList.contains('w')) return;
      var group = document.createElement('span');
      group.className = 'w-group';
      root.insertBefore(group, word);
      group.appendChild(word);
      group.appendChild(space);
      group.appendChild(tag);
    });
  }

  var motionTargets = document.querySelectorAll('[data-split], [data-stagger], [data-reveal]');
  if (motionTargets.length && !reducedMotion && 'IntersectionObserver' in window) {
    document.querySelectorAll('[data-split]').forEach(splitWords);
    document.documentElement.classList.add('motion-ready');
    var motionObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
    motionTargets.forEach(function (el) { motionObserver.observe(el); });
  }

});
