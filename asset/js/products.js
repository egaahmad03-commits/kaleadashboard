/* =========================================================
   Kalea Furniture — Sumber Data Produk & Kategori (Supabase)
   Data TIDAK lagi hardcode di file ini. Setiap halaman memanggil
   loadCatalogData() sekali di awal, hasilnya di-cache di memori
   (CATEGORIES / PRODUCTS) untuk dipakai fungsi-fungsi lain di
   bawah dan oleh catalog-render.js.
   ========================================================= */

/* Ikon generik dipakai sebagai cadangan untuk kategori yang belum
   punya ikon_svg sendiri di database (misalnya kategori baru yang
   ditambah lewat Panel Admin tanpa pilih ikon khusus). */
const GENERIC_CATEGORY_ICON =
  '<rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 10h16"></path>';

var CATEGORIES = [];
var PRODUCTS = [];
var _catalogDataPromise = null;

/* Panggil ini di awal setiap halaman (sebelum render apa pun yang
   butuh data produk/kategori). Aman dipanggil berkali-kali — fetch
   Supabase hanya terjadi sekali per pemuatan halaman (cached). */
function loadCatalogData() {
  if (_catalogDataPromise) return _catalogDataPromise;

  _catalogDataPromise = Promise.all([
    supabaseClient.from("categories").select("*").order("sort_order", { ascending: true }),
    supabaseClient.from("products").select("*, categories(name, slug)").order("id", { ascending: true })
  ]).then(function (results) {
    var catRes = results[0];
    var prodRes = results[1];

    if (catRes.error) throw catRes.error;
    if (prodRes.error) throw prodRes.error;

    CATEGORIES = catRes.data || [];
    PRODUCTS = (prodRes.data || []).map(function (p) {
      p.category = p.categories ? p.categories.name : "";
      p.category_slug = p.categories ? p.categories.slug : "";
      rebuildProductImages(p);
      return p;
    });

    return { categories: CATEGORIES, products: PRODUCTS };
  });

  return _catalogDataPromise;
}

/* Reset cache setelah Panel Admin menambah/mengubah/menghapus data,
   supaya pemanggilan loadCatalogData() berikutnya ambil data segar. */
function invalidateCatalogCache() {
  _catalogDataPromise = null;
}

function formatRupiah(number) {
  return "Rp " + Number(number).toLocaleString("id-ID");
}

/* Escape karakter HTML sensitif (&, <, >, ", ') sebelum data produk
   (nama, deskripsi, dll) dimasukkan ke innerHTML/atribut HTML. */
function escapeHtml(value) {
  var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return map[ch];
  });
}

function getProductsByCategorySlug(slug) {
  return PRODUCTS.filter(function (p) { return p.category_slug === slug; });
}

function getProductById(id) {
  return PRODUCTS.find(function (p) { return p.id === Number(id); });
}

function getCategoryBySlug(slug) {
  return CATEGORIES.find(function (c) { return c.slug === slug; });
}

function getCategoryIcon(category) {
  if (category && category.icon_svg) return category.icon_svg;
  return GENERIC_CATEGORY_ICON;
}

/* =========================================================
   Gambar Produk
   ---------------------------------------------------------
   Setiap produk memiliki folder sendiri di:
     asset/images/products/<slug>/1.jpg .. 6.jpg
   Path dibangun otomatis dari kolom `slug` di database (satu
   sumber, tidak perlu ditulis manual per produk). Foto TETAP
   file statis (tidak dipindah ke Supabase Storage) — cukup
   masukkan file 1.jpg..6.jpg ke folder slug terkait.
   ========================================================= */
const PRODUCT_IMAGE_BASE = (typeof window !== "undefined" && typeof window.KALEA_ASSET_PREFIX === "string" ? window.KALEA_ASSET_PREFIX : "../") + "asset/images/products/";
const PRODUCT_IMAGE_COUNT = 6;
const PRODUCT_IMAGE_EXT = "jpg";

function rebuildProductImages(p) {
  var images = [];
  for (var i = 1; i <= PRODUCT_IMAGE_COUNT; i++) {
    images.push(PRODUCT_IMAGE_BASE + p.slug + "/" + i + "." + PRODUCT_IMAGE_EXT);
  }
  p.images = images;
  p.image = images[0];
  return p;
}

/* Bantu bikin slug otomatis dari nama (dipakai Panel Admin saat
   menambah produk/kategori baru, supaya tidak perlu diisi manual). */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
