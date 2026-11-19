/* =========================================================
   Kalea Furniture — Klien Supabase (satu-satunya sumber koneksi)
   Diisi otomatis oleh Panel Admin saat "Connect" pertama kali,
   atau isi manual di bawah ini kalau mau langsung pakai.
   ========================================================= */

const SUPABASE_URL = "https://kohbicjbewrivprfgegf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaGJpY2piZXdyaXZwcmZnZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MDAzMTQsImV4cCI6MjEwMjE3NjMxNH0.-xBFQrXoNvXv35rSe_TwE9N_fp9pBk72rIA8Tx_rP7E";

/* window.supabase datang dari CDN (lihat tag <script> di setiap
   halaman HTML sebelum file ini). createClient menyiapkan koneksi
   REST + Auth yang dipakai di seluruh situs (publik & admin). */
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Catat satu kunjungan publik per tab setiap 30 menit. Referrer disimpan
   sebagai nama host saja; tidak menyimpan IP, query string, atau identitas. */
(function recordPublicVisit() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var host = window.location.hostname.toLowerCase();
  if (host !== "kaleafurniture.id" && host !== "www.kaleafurniture.id") return;
  if (window.location.pathname === "/404.html" || window.location.pathname.indexOf("/admin/") === 0) return;

  var now = Date.now();
  var storageKey = "kaleaVisitLastAt";
  try {
    var lastVisit = Number(window.sessionStorage.getItem(storageKey) || 0);
    if (lastVisit && now - lastVisit < 30 * 60 * 1000) return;
    window.sessionStorage.setItem(storageKey, String(now));
  } catch (e) {
    // Tracking tetap berjalan bila browser menonaktifkan sessionStorage.
  }

  var referrerHost = null;
  try {
    if (document.referrer) {
      var referrerUrl = new URL(document.referrer);
      if (referrerUrl.origin !== window.location.origin) referrerHost = referrerUrl.hostname.slice(0, 200);
    }
  } catch (e) {
    referrerHost = null;
  }

  supabaseClient.from("website_visits").insert({
    page_path: window.location.pathname.slice(0, 200),
    referrer_host: referrerHost
  }).then(function (result) {
    if (result.error) console.warn("Statistik kunjungan belum dapat direkam:", result.error.message);
  });
})();
