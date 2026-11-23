/* =========================================================
   Kalea Furniture — Render Halaman Katalog
   Dipakai oleh katalog.html, halaman kategori (produk/kategori.html)
   dan halaman detail produk (produk/produk-detail.html).
   Semua fungsi di sini ASYNC karena data sekarang datang dari
   Supabase, bukan array yang sudah ada saat halaman dimuat.
   ========================================================= */

/* Harga produk tidak ditampilkan. Sebagai gantinya, pengunjung diarahkan
   langsung ke WhatsApp untuk menanyakan harga. */
var PRICE_WA_NUMBER = "6289504977797";

function getProductWaUrl(product) {
  var msg = "Halo Kalea Furniture, saya ingin menanyakan harga produk " + product.name + ".";
  return "https://wa.me/" + PRICE_WA_NUMBER + "?text=" + encodeURIComponent(msg);
}

function renderIconPlaceholder(iconSvg) {
  return (
    '<svg class="product-photo-fallback-icon" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    (iconSvg || GENERIC_CATEGORY_ICON) + '</svg>'
  );
}

function renderProductPhoto(src, alt, iconSvg, extraClass) {
  var fallback = renderIconPlaceholder(iconSvg);

  if (!src) {
    return (
      '<div class="product-photo product-photo-placeholder ' + (extraClass || "") + '">' +
      fallback +
      '</div>'
    );
  }

  return (
    '<div class="product-photo ' + (extraClass || "") + '">' +
    '<img src="' + src + '" alt="' + escapeHtml(alt) + '" loading="lazy" draggable="false" ' +
    'onerror="this.closest(\'.product-photo\').classList.add(\'product-photo-placeholder\'); this.remove();">' +
    fallback +
    '</div>'
  );
}

function renderCategoryVisual(category, label) {
  var databasePhoto = category.display_mode === "image" && category.image_url ? category.image_url : "";
  if (databasePhoto) {
    return '<div class="product-icon product-icon-photo"><img src="' + escapeHtml(databasePhoto) + '" alt="' + escapeHtml(label) + '" loading="lazy"></div>';
  }
  return '<div class="product-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (category.icon_svg || GENERIC_CATEGORY_ICON) + '</svg></div>';
}

/* ===== Tombol kategori di katalog.html (dulu hardcode, sekarang dari data) =====
   Sekarang mengecek c.display_mode: kalau "image" dan c.image_url ada,
   tampilkan foto kategori. Kalau tidak, tampilkan icon_svg seperti biasa
   (perilaku lama). Ini menyamakan logika dengan renderCategoryTable() di
   admin panel, yang sudah lebih dulu mengecek display_mode. */
function renderCategoryButtons() {
  var container = document.getElementById("category-grid");
  if (!container) return Promise.resolve();

  return loadCatalogData().then(function () {
    if (CATEGORIES.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada kategori.</p>';
      return;
    }

    container.innerHTML = CATEGORIES.map(function (c) {
      return (
        '<a href="produk/kategori.html?slug=' + encodeURIComponent(c.slug) + '" class="product-card">' +
        renderCategoryVisual(c, c.name) +
        '<h3>' + escapeHtml(c.name) + '</h3>' +
        '</a>'
      );
    }).join("");
  }).catch(function (err) {
    console.error("Gagal memuat kategori:", err);
    container.innerHTML = '<p class="empty-state">Gagal memuat kategori. Coba muat ulang halaman.</p>';
  });
}

/* Alur katalog berbasis ruangan: daftar ruangan dan produk mengikuti pengaturan admin. */
function initRoomCatalog() {
  var roomGrid = document.getElementById("room-grid");
  var categoryGrid = document.getElementById("category-grid");
  var title = document.getElementById("catalog-title");
  var description = document.getElementById("catalog-description");
  var back = document.getElementById("room-back");
  var backBottom = document.getElementById("room-back-bottom");
  var backBottomWrap = document.getElementById("room-back-bottom-wrap");
  var hero = document.querySelector(".catalog-hero");
  var activeRoomKey = null;
  var rooms = [];
  var roomProducts = {};
  var roomDataFromDatabase = false;
  var lastFocusRefresh = 0;
  if (!roomGrid || !categoryGrid) return;

  function assetPrefix() { return typeof window.KALEA_ASSET_PREFIX === "string" ? window.KALEA_ASSET_PREFIX : ""; }
  function fallbackRoomImage(slug) {
    var files = { "ruang-tamu": "catalog-hero.png", "ruang-makan": "hero-dining.png", "kamar-tidur": "hero-bedroom.png", "ruang-kerja": "hero-work.png", "area-outdoor": "hero-outdoor.png" };
    return assetPrefix() + "asset/images/" + (files[slug] || "catalog-hero.png");
  }

  function loadRooms() {
    return Promise.all([
      supabaseClient.from("rooms").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabaseClient.from("room_products").select("room_id, product_id, sort_order").order("sort_order", { ascending: true })
    ]).then(function (results) {
      if (results[0].error || results[1].error) throw results[0].error || results[1].error;
      rooms = results[0].data || [];
      roomDataFromDatabase = true;
      roomProducts = {};
      (results[1].data || []).forEach(function (row) {
        if (!roomProducts[row.room_id]) roomProducts[row.room_id] = [];
        roomProducts[row.room_id].push(Number(row.product_id));
      });
      renderRoomButtons();
      return rooms;
    });
  }

  function renderRoomButtons() {
    roomGrid.innerHTML = rooms.map(function (room) {
      var image = room.image_url || fallbackRoomImage(room.slug);
      var safeImage = String(image).replace(/["\\]/g, "\\$&");
      return '<button class="room-card" type="button" data-room="' + escapeHtml(room.id) + '" style="background-image:linear-gradient(0deg,rgba(0,0,0,.68),rgba(0,0,0,.03) 70%),url(&quot;' + safeImage + '&quot;);background-size:cover;background-position:center"><span>' + escapeHtml(room.name) + '</span></button>';
    }).join("");
    roomGrid.querySelectorAll("[data-room]").forEach(function (button) {
      button.addEventListener("click", function () { showRoom(button.getAttribute("data-room")); });
    });
  }

  function showRoom(roomKey, keepScroll) {
    var room = rooms.find(function (item) { return String(item.id) === String(roomKey); });
    if (!room) return;
    activeRoomKey = roomKey;
    loadCatalogData().then(function () {
      var ids = roomProducts[room.id] || [];
      var products = roomDataFromDatabase
        ? ids.map(function (id) { return PRODUCTS.find(function (product) { return Number(product.id) === id; }); }).filter(Boolean)
        : PRODUCTS.filter(function (product) {
            if ((room.categories || []).indexOf(product.category_slug) !== -1) return true;
            var name = String(product.name || '').toLowerCase();
            return (room.keywords || []).some(function (term) { return name.indexOf(term) !== -1; });
          });
      title.textContent = room.name;
      description.textContent = room.description || "Pilihan furniture untuk " + room.name.toLowerCase() + ".";
      if (hero) {
        hero.removeAttribute("data-room");
        hero.style.backgroundImage = 'linear-gradient(90deg,rgba(20,18,15,.62),rgba(20,18,15,.12) 78%),url("' + String(room.image_url || fallbackRoomImage(room.slug)).replace(/["\\]/g, "\\$&") + '")';
      }
      var cards = products.map(function (product) {
        var image = product.image || (product.images && product.images[0]) || "";
        return '<a href="produk/produk-detail.html?id=' + encodeURIComponent(product.id) + '" class="product-list-card">' + renderProductPhoto(image, product.name, getCategoryIcon(getCategoryBySlug(product.category_slug))) + '<div class="product-list-info"><h3>' + escapeHtml(product.name) + '</h3><span class="product-detail-link">Lihat Detail &rarr;</span></div></a>';
      }).join("");
      categoryGrid.innerHTML = cards || '<p class="empty-state">Belum ada produk yang ditambahkan ke ruangan ini.</p>';
      roomGrid.hidden = true;
      categoryGrid.hidden = false;
      if (back) back.hidden = false;
      if (backBottomWrap) backBottomWrap.hidden = false;
      if (!keepScroll) window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function () {
      categoryGrid.innerHTML = '<p class="empty-state">Gagal memuat kategori. Coba muat ulang halaman.</p>';
      categoryGrid.hidden = false;
    });
  }

  function returnToRooms() {
    activeRoomKey = null;
    categoryGrid.hidden = true;
    roomGrid.hidden = false;
    if (back) back.hidden = true;
    if (backBottomWrap) backBottomWrap.hidden = true;
    title.textContent = "Pilih Ruangan";
    description.textContent = "Mulai dari ruangan yang ingin Anda lengkapi, lalu temukan furniture yang sesuai.";
    if (hero) { hero.removeAttribute("data-room"); hero.style.backgroundImage = ""; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (back) back.addEventListener("click", returnToRooms);
  if (backBottom) backBottom.addEventListener("click", returnToRooms);

  function refreshCategoriesOnReturn() {
    if (!activeRoomKey || document.visibilityState === "hidden") return;
    var now = Date.now();
    if (now - lastFocusRefresh < 1500) return;
    lastFocusRefresh = now;
    invalidateCatalogCache();
    loadRooms().then(function () { showRoom(activeRoomKey, true); }).catch(function (error) { console.warn("Gagal memperbarui daftar ruangan:", error); });
  }
  window.addEventListener("focus", refreshCategoriesOnReturn);
  document.addEventListener("visibilitychange", refreshCategoriesOnReturn);
  loadRooms().catch(function (error) {
    console.error("Gagal memuat ruangan:", error);
    rooms = [
      { id: 'living', slug: 'ruang-tamu', name: 'Ruang Tamu', description: 'Pilihan furniture untuk ruang tamu Anda.', categories: ['sofa','kursi-santai','meja-kopi','meja-samping','meja-konsol','kabinet','kursi-bar'], keywords: ['rak buku','rak tv','rak televisi'] },
      { id: 'dining', slug: 'ruang-makan', name: 'Ruang Makan', description: 'Temukan furniture untuk momen berkumpul bersama.', categories: ['meja-makan','kursi-makan','kursi-bar','kabinet','meja-konsol','meja-samping'] },
      { id: 'bedroom', slug: 'kamar-tidur', name: 'Kamar Tidur', description: 'Lengkapi kamar dengan furniture yang nyaman dan fungsional.', categories: ['rangka-tempat-tidur','lemari','meja-samping','kursi-santai','meja-konsol'], keywords: ['meja rias'] },
      { id: 'work', slug: 'ruang-kerja', name: 'Ruang Kerja', description: 'Pilih furniture untuk ruang kerja yang nyaman.', categories: ['meja-kerja','kabinet','kursi-santai','meja-samping','meja-konsol'], keywords: ['rak buku','kursi kerja','kursi kantor'] },
      { id: 'outdoor', slug: 'area-outdoor', name: 'Area Outdoor', description: 'Jelajahi furniture untuk teras dan area luar ruangan.', categories: ['furnitur-luar-ruangan'] }
    ];
    roomDataFromDatabase = false;
    renderRoomButtons();
  });
}

/* ===== Halaman daftar produk per kategori (produk/kategori.html) ===== */
function renderProductList(slug) {
  var container = document.getElementById("product-list");
  if (!container) return Promise.resolve();

  container.innerHTML = '<p class="empty-state">Memuat produk...</p>';

  return loadCatalogData().then(function () {
    var category = getCategoryBySlug(slug);
    var titleEl = document.getElementById("category-title");
    var descEl = document.getElementById("category-desc");
    var breadcrumbEl = document.getElementById("category-breadcrumb-current");

    if (!category) {
      container.innerHTML = '<p class="empty-state">Kategori tidak ditemukan.</p>';
      if (titleEl) titleEl.textContent = "Kategori Tidak Ditemukan";
      return;
    }

    document.title = category.name + " - Kalea Furniture";
    if (titleEl) titleEl.textContent = category.slug === "furnitur-luar-ruangan" ? "Furniture Outdoor & Taman" : category.name;
    if (descEl) descEl.textContent = "Pilih produk " + category.name.toLowerCase() + " yang sesuai dengan kebutuhan Anda.";
    if (breadcrumbEl) breadcrumbEl.textContent = category.name;

    var query = new URLSearchParams(window.location.search);
    var roomSlugs = query.get("ruang");
    var products = roomSlugs
      ? roomSlugs.split(",").reduce(function (all, roomSlug) { return all.concat(getProductsByCategorySlug(roomSlug)); }, [])
      : getProductsByCategorySlug(slug);
    var roomType = query.get("jenis");
    if (roomType) {
      var terms = roomType.split(",").map(function (term) { return term.toLowerCase(); });
      products = products.filter(function (product) {
        var name = String(product.name || "").toLowerCase();
        return terms.some(function (term) { return name.indexOf(term) !== -1; });
      });
      if (titleEl) titleEl.textContent = query.get("pilihan") || category.name;
      if (descEl) descEl.textContent = "Pilihan furniture dari koleksi Kalea Furniture.";
    }

    if (products.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada produk untuk pilihan ini saat ini.</p>';
      return;
    }

    container.innerHTML = products.map(function (p) {
      var mainImage = p.image || (p.images && p.images[0]) || "";
      return (
        '<a href="produk-detail.html?id=' + p.id + '" class="product-list-card">' +
        '<button type="button" class="card-add-cart" data-add-cart="' + p.id + '" aria-label="Tambah ke keranjang">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' +
        '</button>' +
        renderProductPhoto(mainImage, p.name, category.icon_svg) +
        '<div class="product-list-info">' +
        '<h3>' + escapeHtml(p.name) + '</h3>' +
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
  }).catch(function (err) {
    console.error("Gagal memuat produk:", err);
    container.innerHTML = '<p class="empty-state">Gagal memuat produk. Coba muat ulang halaman.</p>';
  });
}

/* ===== Gallery interaktif halaman detail produk ===== */
function initProductGallery(product, categoryIcon) {
  var images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
  var total = images.length;

  var mainWrap = document.getElementById("gallery-main");
  var thumbWrap = document.getElementById("gallery-thumbs");
  var counter = document.getElementById("gallery-counter");

  if (!mainWrap) return;

  var currentIndex = 0;
  var mouseStartX = null;
  var mouseStartScroll = 0;
  var moved = false;
  var track = null;
  var suppressLightbox = false;

  function updateGallery() {
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
    currentIndex = Math.max(0, Math.min(total - 1, index));
    mainWrap.scrollTo({ left: currentIndex * mainWrap.clientWidth, behavior: "smooth" });
    updateGallery();
  }

  track = document.createElement("div");
  track.className = "gallery-track";
  track.style.width = (Math.max(total, 1) * 100) + "%";
  track.style.setProperty("--gallery-total", Math.max(total, 1));
  track.innerHTML = (total ? images : [""]).map(function (src, index) {
    return '<div class="gallery-slide" data-gallery-index="' + index + '">' + renderProductPhoto(src, product.name, categoryIcon, "product-photo-main") + '</div>';
  }).join("");
  mainWrap.innerHTML = "";
  mainWrap.appendChild(track);

  if (thumbWrap) {
    if (total <= 1) {
      thumbWrap.style.display = "none";
    } else {
      thumbWrap.innerHTML = images.map(function (img, i) {
        return (
          '<button type="button" class="gallery-thumb" data-index="' + i + '" aria-label="Foto ' + (i + 1) + '">' +
          renderProductPhoto(img, product.name + " - foto " + (i + 1), categoryIcon) +
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

  if (total > 1) {
    mainWrap.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      mouseStartX = event.clientX;
      mouseStartScroll = mainWrap.scrollLeft;
      moved = false;
      mainWrap.setPointerCapture(event.pointerId);
      mainWrap.classList.add("is-mouse-dragging");
    });
    mainWrap.addEventListener("pointermove", function (event) {
      if (mouseStartX === null || event.pointerType !== "mouse") return;
      var dx = event.clientX - mouseStartX;
      if (Math.abs(dx) > 6) moved = true;
      if (moved) {
        mainWrap.scrollLeft = mouseStartScroll - dx;
        event.preventDefault();
      }
    });

    function finishDrag(event) {
      if (mouseStartX === null || event.pointerType !== "mouse") return;
      mouseStartX = null;
      mainWrap.classList.remove("is-mouse-dragging");
      if (moved) {
        suppressLightbox = true;
        goTo(Math.round(mainWrap.scrollLeft / Math.max(mainWrap.clientWidth, 1)));
        setTimeout(function () { suppressLightbox = false; }, 400);
      }
    }
    mainWrap.addEventListener("pointerup", finishDrag);
    mainWrap.addEventListener("pointercancel", finishDrag);
    mainWrap.addEventListener("scroll", function () {
      currentIndex = Math.max(0, Math.min(total - 1, Math.round(mainWrap.scrollLeft / Math.max(mainWrap.clientWidth, 1))));
      updateGallery();
    }, { passive: true });
    window.addEventListener("resize", function () {
      mainWrap.scrollLeft = currentIndex * mainWrap.clientWidth;
    });
  }

  mainWrap.addEventListener("click", function (e) {
    if (suppressLightbox) return;
    var slide = e.target.closest(".gallery-slide");
    var img = e.target.closest("img");
    if (slide && img) openLightbox(images[Number(slide.getAttribute("data-gallery-index"))], product.name);
  });

  updateGallery();
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
  var wrapper = document.getElementById("product-detail");
  if (!wrapper) return Promise.resolve();

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");

  return loadCatalogData().then(function () {
    var product = getProductById(id);

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

    var category = getCategoryBySlug(product.category_slug);
    var categorySlug = product.category_slug;

    var breadcrumb = document.getElementById("product-breadcrumb");
    if (breadcrumb) {
      breadcrumb.innerHTML =
        '<a href="../katalog.html">Katalog</a>' +
        '<span class="breadcrumb-sep">/</span>' +
        '<a href="kategori.html?slug=' + encodeURIComponent(categorySlug) + '">' + escapeHtml(product.category) + '</a>' +
        '<span class="breadcrumb-sep">/</span>' +
        '<span class="breadcrumb-current">' + escapeHtml(product.name) + '</span>';
    }

    document.title = product.name + " - Kalea Furniture";

    var waMessage = encodeURIComponent("Halo Kalea Furniture, saya tertarik dengan produk " + product.name + ".");

    wrapper.innerHTML =
      '<div class="product-detail-gallery">' +
      '  <div class="gallery-main-wrap">' +
      '    <div id="gallery-main"></div>' +
      '    <span id="gallery-counter" class="gallery-counter"></span>' +
      '  </div>' +
      '  <div id="gallery-thumbs" class="gallery-thumbs"></div>' +
      '</div>' +
      '<div class="product-detail-info">' +
      '<span class="product-detail-category">' + escapeHtml(product.category) + '</span>' +
      '<h1>' + escapeHtml(product.name) + '</h1>' +
      '<a class="product-price-wa product-price-wa-detail" href="' + getProductWaUrl(product) + '" target="_blank" rel="noopener">Tanya Harga via WhatsApp</a>' +
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
      '<a href="kategori.html?slug=' + encodeURIComponent(categorySlug) + '" class="animated-button">' +
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

    initProductGallery(product, category ? category.icon_svg : null);
  }).catch(function (err) {
    console.error("Gagal memuat produk:", err);
    wrapper.innerHTML = '<p class="empty-state">Gagal memuat produk. Coba muat ulang halaman.</p>';
  });
}
