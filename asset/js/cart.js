/* =========================================================
   Kalea Furniture — Keranjang (Cart)
   ---------------------------------------------------------
   Situs ini statis (tanpa server), jadi "keranjang" di sini
   berfungsi sebagai pengumpul produk pilihan sebelum dikirim
   sebagai SATU pesan WhatsApp ke toko — bukan checkout/
   pembayaran online. Data keranjang disimpan di localStorage
   per-browser (mirip data produk admin).
   ========================================================= */

const CART_STORAGE_KEY = "kalea_cart";
const CART_WA_NUMBER = "6289504977797";

var lastPrunedCount = 0; // jumlah item yang baru dibuang getCart() krn produknya sudah dihapus

function getCart() {
  var cart;
  try {
    var raw = localStorage.getItem(CART_STORAGE_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    cart = [];
  }

  /* Buang item yang produknya sudah dihapus dari katalog (lewat Panel
     Admin, atau data produk yang berubah setelah deploy baru). Tanpa ini,
     badge keranjang tetap menghitung item tsb (notif muncul) padahal saat
     halaman keranjang dibuka, item itu tidak bisa dirender karena
     produknya sudah tidak ada — hasilnya keranjang tampak kosong/rusak
     meski badge menunjukkan ada isi. getProductById hanya tersedia di
     halaman yang memuat products.js. */
  lastPrunedCount = 0;
  if (typeof getProductById === "function") {
    var validCart = cart.filter(function (item) { return !!getProductById(item.id); });
    lastPrunedCount = cart.length - validCart.length;
    if (lastPrunedCount > 0) {
      cart = validCart;
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (e) {
        console.error("Gagal menyimpan keranjang:", e);
      }
    }
  }

  return cart;
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error("Gagal menyimpan keranjang:", e);
  }
  updateCartBadge();
}

function addToCart(productId, qty) {
  qty = qty || 1;
  var cart = getCart();
  var existing = cart.find(function (item) { return item.id === Number(productId); });

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: Number(productId), qty: qty });
  }

  saveCart(cart);
  if (typeof renderCartPage === "function") renderCartPage();
}

function removeFromCart(productId) {
  var cart = getCart().filter(function (item) { return item.id !== Number(productId); });
  saveCart(cart);
  renderCartPage();
}

function setCartQty(productId, qty) {
  qty = Number(qty);
  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }
  var cart = getCart();
  var item = cart.find(function (i) { return i.id === Number(productId); });
  if (item) item.qty = qty;
  saveCart(cart);
  renderCartPage();
}

function getCartCount() {
  return getCart().reduce(function (sum, item) { return sum + item.qty; }, 0);
}

function updateCartBadge() {
  var count = getCartCount();
  document.querySelectorAll(".cart-badge").forEach(function (el) {
    el.textContent = count > 99 ? "99+" : String(count);
    el.style.display = count > 0 ? "flex" : "none";
  });
}

/* ===== Render halaman keranjang (cart.html) ===== */
function renderCartPage() {
  var container = document.getElementById("cartItems");
  if (!container) return; // bukan halaman keranjang

  var cart = getCart();

  var staleNotice = lastPrunedCount > 0 ?
    '<div class="cart-stale-notice">' +
    (lastPrunedCount === 1 ?
      'Ada 1 produk di keranjang yang sudah tidak tersedia dan telah dihapus otomatis.' :
      'Ada ' + lastPrunedCount + ' produk di keranjang yang sudah tidak tersedia dan telah dihapus otomatis.') +
    '</div>' : '';

  if (cart.length === 0) {
    container.innerHTML =
      staleNotice +
      '<div class="cart-empty">' +
      '<p>Keranjang Anda masih kosong.</p>' +
      '<div class="button-container">' +
      '<a href="katalog.html" class="animated-button">' +
      '<svg viewBox="0 0 24 24" class="arr-2" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
      '<span class="text">Lihat Katalog</span>' +
      '<span class="circle"></span>' +
      '<svg viewBox="0 0 24 24" class="arr-1" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>' +
      '</a></div></div>';

    var summaryEl = document.getElementById("cartSummary");
    if (summaryEl) summaryEl.style.display = "none";
    return;
  }

  var total = 0;

  container.innerHTML = staleNotice + cart.map(function (item) {
    var product = getProductById(item.id);
    if (!product) return "";

    var subtotal = product.price * item.qty;
    total += subtotal;
    var mainImage = product.image || (product.images && product.images[0]) || "";

    return (
      '<div class="cart-item">' +
      '<div class="cart-item-photo">' + renderProductPhoto(mainImage, product.name, product.category) + '</div>' +
      '<div class="cart-item-info">' +
      '<h3>' + escapeHtml(product.name) + '</h3>' +
      '<p class="cart-item-price">' + formatRupiah(product.price) + '</p>' +
      '<div class="cart-qty-control">' +
      '<button type="button" aria-label="Kurangi" onclick="setCartQty(' + product.id + ', ' + (item.qty - 1) + ')">&minus;</button>' +
      '<input type="number" min="1" value="' + item.qty + '" onchange="setCartQty(' + product.id + ', this.value)">' +
      '<button type="button" aria-label="Tambah" onclick="setCartQty(' + product.id + ', ' + (item.qty + 1) + ')">+</button>' +
      '</div>' +
      '</div>' +
      '<div class="cart-item-side">' +
      '<span class="cart-item-subtotal">' + formatRupiah(subtotal) + '</span>' +
      '<button type="button" class="cart-item-remove" onclick="removeFromCart(' + product.id + ')" aria-label="Hapus dari keranjang">&#10005;</button>' +
      '</div>' +
      '</div>'
    );
  }).join("");

  var summaryEl = document.getElementById("cartSummary");
  if (summaryEl) {
    summaryEl.style.display = "flex";
  }

  var totalEl = document.getElementById("cartTotal");
  if (totalEl) totalEl.textContent = formatRupiah(total);

  var waBtn = document.getElementById("cartWaButton");
  if (waBtn) {
    waBtn.href = "https://wa.me/" + CART_WA_NUMBER + "?text=" + encodeURIComponent(buildCartWaMessage(cart, total));
  }
}

function buildCartWaMessage(cart, total) {
  var lines = ["Halo Kalea Furniture, saya ingin memesan produk berikut:", ""];

  cart.forEach(function (item) {
    var product = getProductById(item.id);
    if (!product) return;
    lines.push("- " + product.name + " x" + item.qty + " = " + formatRupiah(product.price * item.qty));
  });

  lines.push("");
  lines.push("Total: " + formatRupiah(total));

  return lines.join("\n");
}

document.addEventListener("DOMContentLoaded", function () {
  // renderCartPage() dulu (baru getCart() pertama kali di page load ini,
  // jadi ia yang "melihat" lastPrunedCount untuk notice) — baru
  // updateCartBadge() setelahnya. Di halaman selain cart.html,
  // renderCartPage() langsung return (tidak ada #cartItems) jadi urutan
  // ini tidak berpengaruh sama sekali di sana.
  renderCartPage();
  updateCartBadge();
});
