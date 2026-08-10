/* =========================================================
   Kalea Furniture — Render Halaman Katalog
   Dipakai oleh halaman kategori (produk/*.html) dan
   halaman detail produk (produk/produk-detail.html)
   ========================================================= */

/* Render placeholder ikon kategori (dipakai hanya sebagai
   cadangan apabila gambar produk belum tersedia / gagal dimuat). */
function renderIconPlaceholder(category) {
  var icon = CATEGORY_ICONS[category] || "";
  return (
    '<svg class="product-photo-fallback-icon" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    icon + '</svg>'
  );
}

/* Render satu foto produk. Menampilkan <img> apabila src tersedia,
   dan otomatis jatuh ke placeholder ikon kategori jika src kosong
   atau gambar gagal dimuat (file belum diunggah / rusak / hilang). */
function renderProductPhoto(src, alt, category, extraClass) {
  var fallback = renderIconPlaceholder(category);

  if (!src) {
    return (
      '<div class="product-photo product-photo-placeholder ' + (extraClass || "") + '">' +
      fallback +
      '</div>'
    );
  }

  return (
    '<div class="product-photo ' + (extraClass || "") + '">' +
    '<img src="' + src + '" alt="' + escapeHtml(alt) + '" loading="lazy" ' +
    'onerror="this.closest(\'.product-photo\').classList.add(\'product-photo-placeholder\'); this.remove();">' +
    fallback +
    '</div>'
  );
}

/* ===== Halaman daftar produk per kategori ===== */
function renderProductList(category) {
  var container = document.getElementById("product-list");
  if (!container) return;

  var products = getProductsByCategory(category);

  if (products.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada produk pada kategori ini.</p>';
    return;
  }

  container.innerHTML = products.map(function (p) {
    var mainImage = p.image || (p.images && p.images[0]) || "";
    return (
      '<a href="produk-detail.html?id=' + p.id + '" class="product-list-card">' +
      '<button type="button" class="card-add-cart" data-add-cart="' + p.id + '" aria-label="Tambah ke keranjang">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' +
      '</button>' +
      renderProductPhoto(mainImage, p.name, p.category) +
      '<div class="product-list-info">' +
      '<h3>' + escapeHtml(p.name) + '</h3>' +
      '<p class="product-list-price">' + formatRupiah(p.price) + '</p>' +
      '<span class="product-detail-link">Lihat Detail &rarr;</span>' +
      '</div>' +
      '</a>'
    );
  }).join("");

  container.querySelectorAll("[data-add-cart]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      addToCart(Number(btn.getAttribute("data-add-cart")), 1);
      btn.classList.add("is-added");
      setTimeout(function () { btn.classList.remove("is-added"); }, 1200);
    });
  });
}

/* ===== Gallery interaktif halaman detail produk ===== */
function initProductGallery(product) {
  var images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
  var total = images.length;

  var mainWrap = document.getElementById("gallery-main");
  var thumbWrap = document.getElementById("gallery-thumbs");
  var counter = document.getElementById("gallery-counter");
  var prevBtn = document.getElementById("gallery-prev");
  var nextBtn = document.getElementById("gallery-next");

  if (!mainWrap) return;

  var currentIndex = 0;

  function renderMain() {
    var src = total > 0 ? images[currentIndex] : "";
    mainWrap.innerHTML = renderProductPhoto(src, product.name, product.category, "product-photo-main");

    if (counter) {
      counter.textContent = total > 0 ? (currentIndex + 1) + " / " + total : "";
      counter.style.display = total > 1 ? "block" : "none";
    }

    if (thumbWrap) {
      var thumbs = thumbWrap.querySelectorAll(".gallery-thumb");
      thumbs.forEach(function (t, i) {
        t.classList.toggle("gallery-thumb-active", i === currentIndex);
      });
    }
  }

  function goTo(index) {
    if (total === 0) return;
    currentIndex = (index + total) % total;
    renderMain();
  }

  /* Thumbnail */
  if (thumbWrap) {
    if (total <= 1) {
      thumbWrap.style.display = "none";
    } else {
      thumbWrap.innerHTML = images.map(function (img, i) {
        return (
          '<button type="button" class="gallery-thumb" data-index="' + i + '" aria-label="Foto ' + (i + 1) + '">' +
          renderProductPhoto(img, product.name + " - foto " + (i + 1), product.category) +
          '</button>'
        );
      }).join("");

      thumbWrap.querySelectorAll(".gallery-thumb").forEach(function (btn) {
        btn.addEventListener("click", function () {
          goTo(Number(btn.getAttribute("data-index")));
        });
      });
    }
  }

  /* Previous / Next */
  if (prevBtn && nextBtn) {
    var showNav = total > 1;
    prevBtn.style.display = showNav ? "flex" : "none";
    nextBtn.style.display = showNav ? "flex" : "none";
    prevBtn.addEventListener("click", function () { goTo(currentIndex - 1); });
    nextBtn.addEventListener("click", function () { goTo(currentIndex + 1); });
  }

  /* Klik gambar utama untuk melihat ukuran lebih besar (lightbox ringan) */
  mainWrap.addEventListener("click", function (e) {
    var img = mainWrap.querySelector("img");
    if (img && e.target === img) {
      openLightbox(images[currentIndex], product.name);
    }
  });

  renderMain();
}

function openLightbox(src, alt) {
  if (!src) return;
  var overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = '<img src="' + src + '" alt="' + escapeHtml(alt) + '">';
  overlay.addEventListener("click", function () {
    overlay.remove();
  });
  document.body.appendChild(overlay);
}

/* ===== Halaman detail produk ===== */
function renderProductDetail() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  var product = getProductById(id);

  var wrapper = document.getElementById("product-detail");
  if (!wrapper) return;

  if (!product) {
    wrapper.innerHTML =
      '<div class="page-content">' +
      '<h1>Produk Tidak Ditemukan</h1>' +
      '<p>Produk yang Anda cari tidak tersedia atau sudah tidak berlaku.</p>' +
      '<div class="button-container">' +
      '<a href="../katalog.html" class="animated-button">' +
      '<span class="text">Kembali ke Katalog</span>' +
      '</a></div></div>';
    return;
  }

  var categorySlug = CATEGORY_SLUGS[product.category];

  /* Breadcrumb */
  var breadcrumb = document.getElementById("product-breadcrumb");
  if (breadcrumb) {
    breadcrumb.innerHTML =
      '<a href="../katalog.html">Katalog</a>' +
      '<span class="breadcrumb-sep">/</span>' +
      '<a href="' + categorySlug + '.html">' + escapeHtml(product.category) + '</a>' +
      '<span class="breadcrumb-sep">/</span>' +
      '<span class="breadcrumb-current">' + escapeHtml(product.name) + '</span>';
  }

  document.title = product.name + " - Kalea Furniture";

  var waMessage = encodeURIComponent("Halo Kalea Furniture, saya tertarik dengan produk " + product.name + ".");

  wrapper.innerHTML =
    '<div class="product-detail-gallery">' +
    '  <div class="gallery-main-wrap">' +
    '    <div id="gallery-main"></div>' +
    '    <button type="button" id="gallery-prev" class="gallery-nav gallery-nav-prev" aria-label="Foto sebelumnya">&#8249;</button>' +
    '    <button type="button" id="gallery-next" class="gallery-nav gallery-nav-next" aria-label="Foto berikutnya">&#8250;</button>' +
    '    <span id="gallery-counter" class="gallery-counter"></span>' +
    '  </div>' +
    '  <div id="gallery-thumbs" class="gallery-thumbs"></div>' +
    '</div>' +
    '<div class="product-detail-info">' +
    '<span class="product-detail-category">' + escapeHtml(product.category) + '</span>' +
    '<h1>' + escapeHtml(product.name) + '</h1>' +
    '<p class="product-detail-price">' + formatRupiah(product.price) + '</p>' +
    '<p class="product-detail-desc">' + escapeHtml(product.description) + '</p>' +
    '<table class="product-spec-table">' +
    '<tr><th>Kategori</th><td>' + escapeHtml(product.category) + '</td></tr>' +
    '<tr><th>Material</th><td>' + escapeHtml(product.material) + '</td></tr>' +
    '<tr><th>Warna</th><td>' + escapeHtml(product.color) + '</td></tr>' +
    '<tr><th>Dimensi</th><td>' + escapeHtml(product.dimensions) + '</td></tr>' +
    '</table>' +
    '<div class="button-container product-detail-actions">' +
    '<button type="button" id="detailAddCart" class="animated-button">' +
    '<svg viewBox="0 0 24 24" class="arr-2" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
    '<span class="text">Tambah ke Keranjang</span>' +
    '<span class="circle"></span>' +
    '<svg viewBox="0 0 24 24" class="arr-1" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
    '</button>' +
    '<a href="https://wa.me/6289504977797?text=' + waMessage + '" target="_blank" rel="noopener" class="animated-button">' +
    '<svg viewBox="0 0 24 24" class="arr-2" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
    '<span class="text">Pesan via WhatsApp</span>' +
    '<span class="circle"></span>' +
    '<svg viewBox="0 0 24 24" class="arr-1" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
    '</a>' +
    '<a href="' + categorySlug + '.html" class="animated-button">' +
    '<svg viewBox="0 0 24 24" class="arr-2" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
    '<span class="text">Kembali ke ' + escapeHtml(product.category) + '</span>' +
    '<span class="circle"></span>' +
    '<svg viewBox="0 0 24 24" class="arr-1" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
    '</a>' +
    '</div>' +
    '</div>';

  var addCartBtn = document.getElementById("detailAddCart");
  if (addCartBtn) {
    addCartBtn.addEventListener("click", function () {
      addToCart(product.id, 1);
      var textEl = addCartBtn.querySelector(".text");
      if (textEl) {
        var original = textEl.textContent;
        textEl.textContent = "Ditambahkan \u2713";
        setTimeout(function () { textEl.textContent = original; }, 1500);
      }
    });
  }

  initProductGallery(product);
}
