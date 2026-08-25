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
