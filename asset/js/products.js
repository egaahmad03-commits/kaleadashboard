/* =========================================================
   Kalea Furniture — Sumber Data Produk (Dummy/Local)
   Satu-satunya sumber data produk untuk seluruh halaman katalog.
   Tambah/ubah produk cukup di array PRODUCTS di bawah ini.
   ========================================================= */

/* Ikon per kategori — TIDAK lagi dipakai sebagai foto produk.
   Dipertahankan sebagai cadangan/placeholder visual apabila
   suatu produk belum memiliki file gambar (lihat renderProductPhoto
   di catalog-render.js) dan untuk kebutuhan lain di masa depan. */
const CATEGORY_ICONS = {
  "Kursi Makan": '<path d="M6 3h12v9H6z"></path><path d="M6 12v9"></path><path d="M18 12v9"></path><path d="M6 17h12"></path>',
  "Kursi Bar": '<path d="M8 3h8v6H8z"></path><path d="M9 9l-1 12"></path><path d="M15 9l1 12"></path><path d="M7 21h10"></path>',
  "Kursi Santai": '<path d="M4 19V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10"></path><path d="M4 14h8"></path><path d="M12 11h6a2 2 0 0 1 2 2v6"></path><path d="M2 19h20"></path>',
  "Sofa": '<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3z"></path><path d="M3 14v5"></path><path d="M21 14v5"></path><path d="M3 19h18"></path><path d="M5 9V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2"></path>',
  "Meja Kopi": '<ellipse cx="12" cy="7" rx="9" ry="3"></ellipse><path d="M6 9v6"></path><path d="M18 9v6"></path><path d="M4 15h16"></path>',
  "Meja Samping": '<rect x="6" y="4" width="12" height="4" rx="1"></rect><path d="M8 8v12"></path><path d="M16 8v12"></path>',
  "Meja Makan": '<rect x="3" y="8" width="18" height="3" rx="1"></rect><path d="M5 11v9"></path><path d="M19 11v9"></path>',
  "Meja Kerja": '<rect x="3" y="4" width="18" height="3" rx="1"></rect><path d="M5 7v13"></path><path d="M19 7v13"></path><path d="M5 16h6"></path>',
  "Meja Konsol": '<rect x="4" y="5" width="16" height="3" rx="1"></rect><path d="M6 8v11"></path><path d="M18 8v11"></path><path d="M4 19h16"></path>',
  "Kabinet": '<rect x="4" y="3" width="16" height="18" rx="1"></rect><path d="M4 12h16"></path><path d="M9 7v3"></path><path d="M9 16v3"></path>',
  "Lemari": '<rect x="4" y="2" width="16" height="20" rx="1"></rect><path d="M12 2v20"></path><path d="M9 12v.01"></path><path d="M15 12v.01"></path>',
  "Rangka Tempat Tidur": '<path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"></path><path d="M2 18v3"></path><path d="M22 18v3"></path><path d="M2 12V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"></path><path d="M2 18h20"></path>',
  "Furnitur Luar Ruangan": '<path d="M12 2v6"></path><path d="M5 10h14l-1.5 4h-11z"></path><path d="M9 14v7"></path><path d="M15 14v7"></path><path d="M6 21h12"></path>'
};

/* Peta nama kategori -> slug file halaman kategori di /produk/ */
const CATEGORY_SLUGS = {
  "Kursi Makan": "kursi-makan",
  "Kursi Bar": "kursi-bar",
  "Kursi Santai": "kursi-santai",
  "Sofa": "sofa",
  "Meja Kopi": "meja-kopi",
  "Meja Samping": "meja-samping",
  "Meja Makan": "meja-makan",
  "Meja Kerja": "meja-kerja",
  "Meja Konsol": "meja-konsol",
  "Kabinet": "kabinet",
  "Lemari": "lemari",
  "Rangka Tempat Tidur": "rangka-tempat-tidur",
  "Furnitur Luar Ruangan": "furnitur-luar-ruangan"
};

/* === KALEA_PRODUCTS_DATA_START ===
   JANGAN edit dua baris penanda ini atau hapus koma di akhir tiap
   baris produk — Panel Admin menulis ulang isi di antara penanda
   ini secara otomatis (satu baris per produk) setiap kali produk
   disimpan/dihapus lewat admin (kalau folder project terhubung). */
const DEFAULT_PRODUCTS = [
  {"id":1,"name":"Kursi Makan Fyn","category":"Kursi Makan","price":1800000,"description":"Fyn menghadirkan kualitas dan gaya khas Italia pada kursi wishbone bergaya mid-century modern yang ikonik. Dibalut dengan sentuhan akhir kayu walnut, kursi makan kayu ini merayakan siluet abadi melalui kaki-kaki yang meruncing, palang penyangga yang halus, sandaran melengkung beraksen bilah, serta dudukan yang dipahat rapi. Dirancang untuk kenyamanan di meja makan, Fyn mempercantik dekorasi ruang makan Anda dengan keanggunan yang bersahaja.","material":"Kayu Jati Solid","color":"Dark Walnut","dimensions":"52 cm x 53 cm x 76,5 cm","slug":"kursi-makan-via"},
  {"id":2,"name":"Kursi Makan Via","category":"Kursi Makan","price":2400000,"description":"Terinspirasi oleh desain vintage Italia, kursi skulptural Via memanjakan ruang makan Anda dengan tampilan menawan layaknya di galeri desain serta kenyamanan yang melimpah. Kayu walnut dari sumber berkelanjutan membentuk rangkanya dengan lekukan organik dan garis-garis mengalir yang membentuk dudukan silang serta kaki-kaki belakang yang memanjang. Bantal sandaran oval yang melengkung dan dudukan empuk memikat dengan balutan kain beludru (velvet) berwarna toffee brown.","material":"Kayu Jati Solid","color":"Dark Walnut","dimensions":"46 cm x 57,5 cm x 75 cm","slug":"kursi-makan-via-2"},
  {"id":3,"name":"Kursi Makan Paolo","category":"Kursi Makan","price":1600000,"description":"Kursi makan Paolo menghadirkan lengkungan paddle-back klasik ala mid-century modern. Dibalut veneer white oak bertekstur, dudukan berkonturnya nyaman untuk santap santai. Warna ebonized hitam memberi kesan dramatis pada siluetnya yang santai, menjadikannya pasangan ideal untuk meja makan modern Anda.","material":"Kayu Jati Solid","color":"Hitam Doff","dimensions":"47 cm x 54 cm x 76 cm","slug":"kursi-makan-paolo"},
  {"id":4,"name":"Kursi Makan Athene","category":"Kursi Makan","price":2200000,"description":"62 cm x 53 cm x 72,5 cm","material":"Kayu Jati Solid","color":"Natural","dimensions":"62 cm x 53 cm x 72,5 cm","slug":"kursi-makan-libby"},
  {"id":5,"name":"Kursi Makan Libby","category":"Kursi Makan","price":2000000,"description":"Gaya modern berpadu retro pada desain ramping kursi makan Odelle. Dilengkapi kaki meruncing dan sandaran anyaman rotan, kursi ini memberi tampilan menawan lewat rangka nettlewood bernuansa light-toasted brown atau brushed ebony. Dibalut dudukan kain campuran linen netral berkualitas tinggi, kursi ini memadukan kenyamanan dan kesan elegan.","material":"Kayu Jati Solid","color":"Hitam Doff","dimensions":"50 cm x 63 cm x 91 cm","slug":"kursi-makan-libby-2"},
];
/* === KALEA_PRODUCTS_DATA_END === */

/* =========================================================
   Gambar Produk
   ---------------------------------------------------------
   Setiap produk memiliki folder sendiri di:
     asset/images/products/<slug>/1.jpg .. 4.jpg
   Path dibangun otomatis dari `slug` (satu sumber, tidak
   perlu ditulis manual per produk). Cukup masukkan file
   1.jpg, 2.jpg, 3.jpg, 4.jpg ke folder slug terkait —
   tidak perlu mengubah kode apa pun.

   Halaman yang memakai data ini (produk/*.html dan
   produk/produk-detail.html) berada di dalam folder
   /produk/, sehingga base path dimulai dari "../".
   ========================================================= */
const PRODUCT_IMAGE_BASE = (typeof window !== "undefined" && typeof window.KALEA_ASSET_PREFIX === "string" ? window.KALEA_ASSET_PREFIX : "../") + "asset/images/products/";
const PRODUCT_IMAGE_COUNT = 6;
const PRODUCT_IMAGE_EXT = "jpg"; // gunakan .jpg untuk foto produk (ukuran file jauh lebih kecil dari .png untuk foto)

/*
 * Path gambar dibangun otomatis dari slug produk.
 * Untuk mengunggah foto baru: simpan sebagai 1.jpg, 2.jpg, dst
 * di folder asset/images/products/<slug>/ (maks ~1200px sisi terpanjang,
 * kualitas JPEG 80-85% sudah cukup tajam untuk web dan jauh lebih ringan).
 */
function rebuildProductImages(p) {
  var images = [];
  for (var i = 1; i <= PRODUCT_IMAGE_COUNT; i++) {
    images.push(PRODUCT_IMAGE_BASE + p.slug + "/" + i + "." + PRODUCT_IMAGE_EXT);
  }
  p.images = images;
  p.image = images[0];
  return p;
}

/* =========================================================
   Penyimpanan Perubahan Admin (localStorage)
   ---------------------------------------------------------
   Situs ini murni statis (tanpa server/database), sehingga
   perubahan yang dibuat lewat Panel Admin (admin/admin.html)
   disimpan di localStorage browser. Saat halaman mana pun
   dimuat, data ini dibaca lebih dulu; jika belum ada,
   data bawaan (DEFAULT_PRODUCTS) yang dipakai.

   Catatan: localStorage bersifat per-browser/per-perangkat, jadi
   perubahan admin hanya "aktif" langsung di browser tempat admin
   login. TAPI kalau folder project dihubungkan di Panel Admin
   (tombol kanan atas), setiap simpan/hapus produk juga otomatis
   menulis ulang array DEFAULT_PRODUCTS di file ini ke disk —
   tinggal commit & push ke GitHub agar semua pengunjung melihat
   data terbaru (lihat writeProductsFileToProjectFolder di admin.js).
   ========================================================= */
const PRODUCTS_STORAGE_KEY = "kalea_products_data";

var PRODUCTS;
try {
  var savedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  PRODUCTS = savedProducts ? JSON.parse(savedProducts) : DEFAULT_PRODUCTS.slice();
} catch (e) {
  PRODUCTS = DEFAULT_PRODUCTS.slice();
}

function persistProducts() {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(PRODUCTS));
  } catch (e) {
    console.error("Gagal menyimpan data produk ke localStorage:", e);
  }
}

PRODUCTS.forEach(rebuildProductImages);

/* =========================================================
   Penomoran ID Produk (selalu naik, tidak pernah dipakai ulang)
   ---------------------------------------------------------
   ID produk berikutnya disimpan terpisah di localStorage dan
   HANYA bertambah naik. Ini penting supaya kalau sebuah produk
   dihapus lewat Panel Admin, ID bekasnya tidak pernah dipakai
   lagi oleh produk baru — mencegah ID "nyasar" ke produk lain
   (misalnya kalau ada link, riwayat pesanan, atau data lama yang
   masih mengacu ke ID tersebut).
   ========================================================= */
const PRODUCTS_NEXT_ID_KEY = "kalea_products_next_id";

function getStoredNextId() {
  try {
    var stored = localStorage.getItem(PRODUCTS_NEXT_ID_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch (e) {
    return null;
  }
}

function persistNextId(id) {
  try {
    localStorage.setItem(PRODUCTS_NEXT_ID_KEY, String(id));
  } catch (e) {
    console.error("Gagal menyimpan counter ID produk ke localStorage:", e);
  }
}

var maxExistingProductId = PRODUCTS.reduce(function (max, p) { return Math.max(max, p.id); }, 0);
var storedNextProductId = getStoredNextId();
var nextProductIdCounter = Math.max(storedNextProductId || 0, maxExistingProductId + 1, 1);
persistNextId(nextProductIdCounter);

/* Ambil ID unik untuk produk baru. Selalu naik — tidak pernah
   mengisi ulang ID bekas produk yang sudah dihapus. */
function getNextProductId() {
  var id = nextProductIdCounter;
  nextProductIdCounter += 1;
  persistNextId(nextProductIdCounter);
  return id;
}

function formatRupiah(number) {
  return "Rp " + number.toLocaleString("id-ID");
}

/* Escape karakter HTML sensitif (&, <, >, ", ') sebelum data produk
   (nama, deskripsi, dll — yang diinput bebas lewat form admin)
   dimasukkan ke innerHTML/atribut HTML di halaman publik maupun admin.
   Mencegah karakter seperti < atau " merusak tampilan atau
   menyisipkan HTML/script yang tidak diinginkan. */
function escapeHtml(value) {
  var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return map[ch];
  });
}

function getProductsByCategory(category) {
  return PRODUCTS.filter(function (p) { return p.category === category; });
}

function getProductById(id) {
  return PRODUCTS.find(function (p) { return p.id === Number(id); });
}