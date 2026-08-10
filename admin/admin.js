/* =========================================================
   Kalea Furniture — Admin Panel
   - Login sederhana (client-side) untuk mengakses dashboard
   - CRUD produk terhubung ke asset/js/products.js
   - Perubahan disimpan di localStorage sehingga tetap ada
     saat halaman dibuka lagi, dan otomatis tampil di
     katalog toko (lihat bagian akhir asset/js/products.js)
   ========================================================= */

const ADMIN_SESSION_KEY = "kalea_admin_session";

// Kredensial login demo. Ganti sesuai kebutuhan Anda.
// PENTING: ini hanya proteksi sisi-klien (front-end saja),
// karena situs ini tidak memiliki server/database.
// Untuk keamanan sungguhan di produksi, login harus divalidasi
// oleh backend, bukan oleh JavaScript di browser.
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "kalea2026"
};

/* ==================== LOGIN ==================== */
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberEl = document.getElementById('rememberMe');
    const rememberMe = !!(rememberEl && rememberEl.checked);
    const errorEl = document.getElementById('loginError');

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // "Ingat saya" dicentang -> localStorage (tetap login walau browser ditutup).
        // Tidak dicentang -> sessionStorage (otomatis logout saat tab/browser ditutup).
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(ADMIN_SESSION_KEY, username);
        window.location.href = "admin.html";
    } else if (errorEl) {
        errorEl.textContent = "Username atau password salah.";
        errorEl.style.display = "block";
    }
}

function handleLogout(event) {
    if (event) event.preventDefault();
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = "login.html";
}

// Lindungi halaman dashboard: lempar ke login jika belum masuk
function requireAuth() {
    if (!document.getElementById('productTableBody')) return; // bukan halaman dashboard
    const user = localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    const userLabel = document.getElementById('loggedInUser');
    if (userLabel) userLabel.textContent = user;
}

/* =========================================================
   Koneksi Folder Project (File System Access API)
   ---------------------------------------------------------
   Memungkinkan admin memilih folder project (hasil clone repo
   GitHub) satu kali, lalu foto produk yang diunggah lewat form
   otomatis dikonversi ke JPG dan ditulis langsung ke
   asset/images/products/<slug>/ di folder tersebut — tinggal
   di-commit & push dari terminal/GitHub Desktop.

   Catatan penting:
   - Hanya didukung Chrome/Edge (browser berbasis Chromium),
     dan halaman ini harus dibuka lewat http://localhost, bukan
     dibuka langsung sebagai file (file://).
   - Izin akses folder disimpan browser per-origin. Setelah
     restart browser, mungkin perlu klik "Hubungkan" sekali lagi
     untuk memberi izin ulang (dialog konfirmasi singkat, folder
     yang sama tidak perlu dipilih ulang).
   ========================================================= */
const FS_SUPPORTED = typeof window !== "undefined" && "showDirectoryPicker" in window;
let projectFolderHandle = null;

// Penyimpanan handle folder di IndexedDB (localStorage tidak bisa
// menyimpan objek handle, harus IndexedDB).
function idbGetStore(mode) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("kalea_admin_fs", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("handles");
        req.onsuccess = () => resolve(req.result.transaction("handles", mode).objectStore("handles"));
        req.onerror = () => reject(req.error);
    });
}

async function idbSaveFolderHandle(handle) {
    const store = await idbGetStore("readwrite");
    return new Promise((resolve, reject) => {
        const req = store.put(handle, "projectFolder");
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function idbLoadFolderHandle() {
    const store = await idbGetStore("readonly");
    return new Promise((resolve) => {
        const req = store.get("projectFolder");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

function setFolderStatus(connected, message) {
    const btn = document.getElementById('folderConnectBtn');
    const label = document.getElementById('folderConnectLabel');
    const note = document.getElementById('folderStatusNote');
    if (!btn || !label) return;
    btn.classList.toggle('is-connected', !!connected);
    label.textContent = connected ? 'Folder Project Terhubung' : 'Hubungkan Folder Project';
    if (note) note.textContent = message || '';
}

// Dipanggil saat halaman dibuka: coba pulihkan folder yang pernah
// dipilih sebelumnya, tanpa perlu user memilih ulang.
async function restoreProjectFolder() {
    if (!FS_SUPPORTED) {
        setFolderStatus(false, 'Fitur unggah foto otomatis butuh Chrome/Edge, dan halaman dibuka lewat http://localhost (bukan double-click file HTML).');
        return;
    }
    const handle = await idbLoadFolderHandle();
    if (!handle) {
        setFolderStatus(false, 'Belum terhubung ke folder project. Klik tombol di kanan atas agar foto bisa otomatis tersimpan ke folder repo Anda.');
        return;
    }
    try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
            projectFolderHandle = handle;
            setFolderStatus(true, 'Folder "' + handle.name + '" terhubung. Foto akan otomatis tersimpan saat produk disimpan.');
        } else {
            setFolderStatus(false, 'Folder "' + handle.name + '" pernah terhubung, tapi izin perlu dikonfirmasi ulang — klik tombol di kanan atas.');
        }
    } catch (e) {
        setFolderStatus(false, 'Belum terhubung ke folder project.');
    }
}

async function connectProjectFolder() {
    if (!FS_SUPPORTED) {
        alert('Fitur ini hanya didukung di Chrome/Edge, dan halaman admin harus dibuka lewat http://localhost (server lokal), bukan dibuka langsung sebagai file.');
        return;
    }
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        // Validasi ringan: pastikan ini folder project yang benar
        // (harus punya folder "asset" di dalamnya).
        try {
            await handle.getDirectoryHandle('asset');
        } catch (e) {
            const proceed = confirm('Folder yang dipilih sepertinya bukan folder root project (tidak ada folder "asset" di dalamnya). Lanjutkan memakai folder ini?');
            if (!proceed) return;
        }
        projectFolderHandle = handle;
        await idbSaveFolderHandle(handle);
        setFolderStatus(true, 'Folder "' + handle.name + '" terhubung. Foto akan otomatis tersimpan saat produk disimpan.');
    } catch (e) {
        if (e && e.name !== 'AbortError') {
            console.error('Gagal menghubungkan folder:', e);
            alert('Gagal menghubungkan folder: ' + e.message);
        }
    }
}

/* =========================================================
   Upload & Konversi Foto Produk
   ---------------------------------------------------------
   Foto yang dipilih di form (klik atau drag & drop) langsung
   digambar ulang ke <canvas> lalu di-export sebagai JPEG
   (kualitas 85%, sisi terpanjang dibatasi 1200px) — berlaku
   untuk file PNG, WebP, maupun JPG sekalipun, supaya semua
   foto produk konsisten ringan untuk web.
   ========================================================= */
const MAX_PRODUCT_PHOTOS = typeof PRODUCT_IMAGE_COUNT !== 'undefined' ? PRODUCT_IMAGE_COUNT : 6;
const PHOTO_MAX_DIMENSION = 1200;
const PHOTO_JPEG_QUALITY = 0.85;

let pendingPhotoBlobs = []; // { blob, previewUrl } dalam urutan tampil (index 0 = 1.jpg, dst)

function convertImageFileToJpeg(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            let { width, height } = img;
            if (width > PHOTO_MAX_DIMENSION || height > PHOTO_MAX_DIMENSION) {
                if (width >= height) {
                    height = Math.round(height * (PHOTO_MAX_DIMENSION / width));
                    width = PHOTO_MAX_DIMENSION;
                } else {
                    width = Math.round(width * (PHOTO_MAX_DIMENSION / height));
                    height = PHOTO_MAX_DIMENSION;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // Latar putih dulu (JPEG tidak mendukung transparansi;
            // PNG dengan area transparan akan jadi putih, bukan hitam).
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(objectUrl);
                if (blob) resolve(blob); else reject(new Error('Konversi gambar gagal.'));
            }, 'image/jpeg', PHOTO_JPEG_QUALITY);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('File "' + file.name + '" bukan gambar yang valid.'));
        };
        img.src = objectUrl;
    });
}

function renderPhotoPreviews() {
    const list = document.getElementById('photoPreviewList');
    const status = document.getElementById('photoStatusNote');
    if (!list) return;
    list.innerHTML = pendingPhotoBlobs.map((p, i) => `
        <div class="photo-preview-item">
            <span class="photo-preview-index">${i + 1}.jpg</span>
            <img src="${p.previewUrl}" alt="Preview foto ${i + 1}">
            <button type="button" class="photo-preview-remove" onclick="removePendingPhoto(${i})" title="Hapus">&times;</button>
        </div>
    `).join('');
    if (status) {
        status.textContent = pendingPhotoBlobs.length > 0
            ? pendingPhotoBlobs.length + ' foto siap disimpan (urutan sesuai tampilan di atas).'
            : '';
    }
}

function removePendingPhoto(index) {
    const removed = pendingPhotoBlobs.splice(index, 1);
    removed.forEach(p => URL.revokeObjectURL(p.previewUrl));
    renderPhotoPreviews();
}

function resetPendingPhotos() {
    pendingPhotoBlobs.forEach(p => URL.revokeObjectURL(p.previewUrl));
    pendingPhotoBlobs = [];
    renderPhotoPreviews();
    const input = document.getElementById('productPhotoInput');
    if (input) input.value = '';
}

async function handlePhotoFilesSelected(fileList) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const remainingSlots = MAX_PRODUCT_PHOTOS - pendingPhotoBlobs.length;
    if (remainingSlots <= 0) {
        alert('Maksimal ' + MAX_PRODUCT_PHOTOS + ' foto per produk. Hapus salah satu foto dulu untuk mengganti.');
        return;
    }
    const toProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
        alert('Hanya ' + remainingSlots + ' foto pertama yang diproses (maksimal ' + MAX_PRODUCT_PHOTOS + ' foto per produk).');
    }

    for (const file of toProcess) {
        try {
            const jpegBlob = await convertImageFileToJpeg(file);
            pendingPhotoBlobs.push({ blob: jpegBlob, previewUrl: URL.createObjectURL(jpegBlob) });
        } catch (e) {
            console.error(e);
            alert(e.message);
        }
    }
    renderPhotoPreviews();
    const input = document.getElementById('productPhotoInput');
    if (input) input.value = '';
}

// Drag & drop di area dropzone
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('photoDropzone');
    if (!dropzone) return;
    ['dragenter', 'dragover'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropzone.classList.add('is-dragover');
        });
    });
    ['dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropzone.classList.remove('is-dragover');
        });
    });
    dropzone.addEventListener('drop', (e) => {
        handlePhotoFilesSelected(e.dataTransfer.files);
    });
});

// Tulis foto (pendingPhotoBlobs) ke asset/images/products/<slug>/N.jpg
// di folder project yang terhubung.
async function writePhotosToProjectFolder(slug) {
    if (!projectFolderHandle) throw new Error('Folder project belum terhubung.');

    const perm = await projectFolderHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
        const req = await projectFolderHandle.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') throw new Error('Izin akses folder ditolak.');
    }

    const assetDir = await projectFolderHandle.getDirectoryHandle('asset', { create: true });
    const imagesDir = await assetDir.getDirectoryHandle('images', { create: true });
    const productsDir = await imagesDir.getDirectoryHandle('products', { create: true });
    const slugDir = await productsDir.getDirectoryHandle(slug, { create: true });

    for (let i = 0; i < pendingPhotoBlobs.length; i++) {
        const fileHandle = await slugDir.getFileHandle((i + 1) + '.jpg', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(pendingPhotoBlobs[i].blob);
        await writable.close();
    }
}

/* =========================================================
   Tulis ulang array DEFAULT_PRODUCTS di asset/js/products.js
   di folder project yang terhubung, supaya data produk (bukan
   cuma foto) juga otomatis ada di file — tinggal di-commit &
   push ke GitHub, tidak perlu edit manual.
   Menimpa HANYA teks di antara penanda KALEA_PRODUCTS_DATA_START
   dan KALEA_PRODUCTS_DATA_END, jadi bagian lain file (ikon
   kategori, dst) tidak tersentuh.
   ========================================================= */
const PRODUCTS_DATA_START_MARKER = '/* === KALEA_PRODUCTS_DATA_START ===';
const PRODUCTS_DATA_END_MARKER = '/* === KALEA_PRODUCTS_DATA_END === */';

async function writeProductsFileToProjectFolder() {
    if (!projectFolderHandle) return; // belum terhubung — lewati diam-diam, data tetap aman di localStorage

    const perm = await projectFolderHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
        const req = await projectFolderHandle.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') throw new Error('Izin akses folder ditolak.');
    }

    const assetDir = await projectFolderHandle.getDirectoryHandle('asset', { create: true });
    const jsDir = await assetDir.getDirectoryHandle('js', { create: true });
    const fileHandle = await jsDir.getFileHandle('products.js', { create: false });
    const file = await fileHandle.getFile();
    const currentText = await file.text();

    const startIdx = currentText.indexOf(PRODUCTS_DATA_START_MARKER);
    const endIdx = currentText.indexOf(PRODUCTS_DATA_END_MARKER);
    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Penanda data produk tidak ditemukan di asset/js/products.js (mungkin filenya versi lama/dimodifikasi). Update manual dulu file products.js ke versi terbaru.');
    }

    // Hanya field data produk yang ditulis ke DEFAULT_PRODUCTS;
    // field "images"/"image" dibangun otomatis dari slug saat load
    // (lihat rebuildProductImages), jadi tidak perlu disimpan di sini.
    const cleanProducts = PRODUCTS.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
        material: p.material,
        color: p.color,
        dimensions: p.dimensions,
        slug: p.slug
    }));

    const productLines = cleanProducts.map(p => '  ' + JSON.stringify(p) + ',');
    const newBlock =
        PRODUCTS_DATA_START_MARKER + '\n' +
        '   JANGAN edit dua baris penanda ini atau hapus koma di akhir tiap\n' +
        '   baris produk — Panel Admin menulis ulang isi di antara penanda\n' +
        '   ini secara otomatis (satu baris per produk) setiap kali produk\n' +
        '   disimpan/dihapus lewat admin (kalau folder project terhubung). */\n' +
        'const DEFAULT_PRODUCTS = [\n' +
        productLines.join('\n') + '\n' +
        '];\n' +
        PRODUCTS_DATA_END_MARKER;

    const newText = currentText.slice(0, startIdx) + newBlock + currentText.slice(endIdx + PRODUCTS_DATA_END_MARKER.length);

    const writable = await fileHandle.createWritable();
    await writable.write(newText);
    await writable.close();
}

/* ==================== RENDER TABEL PRODUK ==================== */
// Placeholder abu-abu (data URI, tidak butuh internet) untuk produk tanpa foto
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><rect width="45" height="45" fill="#e2e8f0"/></svg>'
);

let currentCategoryFilter = "all";
let selectedProductIds = new Set();

function populateCategoryFilterOptions() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    const categories = Object.keys(CATEGORY_SLUGS);
    select.innerHTML = '<option value="all">Semua Kategori</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    select.value = currentCategoryFilter;
}

function onCategoryFilterChange() {
    const select = document.getElementById('categoryFilter');
    currentCategoryFilter = select ? select.value : 'all';
    selectedProductIds.clear();
    renderProducts();
}

function getFilteredProducts() {
    if (currentCategoryFilter === 'all') return PRODUCTS;
    return PRODUCTS.filter(p => p.category === currentCategoryFilter);
}

function updateBulkDeleteBar() {
    const btn = document.getElementById('bulkDeleteBtn');
    const countEl = document.getElementById('bulkDeleteCount');
    if (!btn) return;
    const count = selectedProductIds.size;
    if (countEl) countEl.textContent = count;
    btn.style.display = count > 0 ? 'flex' : 'none';

    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) {
        const visible = getFilteredProducts();
        const visibleSelectedCount = visible.filter(p => selectedProductIds.has(p.id)).length;
        selectAll.checked = visible.length > 0 && visibleSelectedCount === visible.length;
        selectAll.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visible.length;
    }
}

function toggleRowSelection(id, checked) {
    if (checked) selectedProductIds.add(id);
    else selectedProductIds.delete(id);
    updateBulkDeleteBar();
}

function toggleSelectAll(checkbox) {
    const visible = getFilteredProducts();
    if (checkbox.checked) {
        visible.forEach(p => selectedProductIds.add(p.id));
    } else {
        visible.forEach(p => selectedProductIds.delete(p.id));
    }
    renderProducts();
}

async function bulkDeleteProducts() {
    const count = selectedProductIds.size;
    if (count === 0) return;
    if (!confirm(`Hapus ${count} produk terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;

    PRODUCTS = PRODUCTS.filter(p => !selectedProductIds.has(p.id));
    selectedProductIds.clear();
    persistProducts();

    try {
        await writeProductsFileToProjectFolder();
    } catch (e) {
        console.error('Gagal menulis products.js:', e);
        alert('Produk terhapus di browser, tapi GAGAL ditulis ke asset/js/products.js: ' + e.message + ' — data belum siap di-push ke GitHub.');
    }

    renderProducts();
}

function renderProducts() {
    const tableBody = document.getElementById('productTableBody');
    if (!tableBody || typeof PRODUCTS === 'undefined') return;

    const visibleProducts = getFilteredProducts();

    tableBody.innerHTML = '';

    if (visibleProducts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Tidak ada produk pada kategori ini.</td></tr>';
        updateStats();
        updateBulkDeleteBar();
        return;
    }

    visibleProducts.forEach(product => {
        const row = document.createElement('tr');
        const imgSrc = (product.images && product.images[0]) || product.image || '';
        const isChecked = selectedProductIds.has(product.id);
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleRowSelection(${product.id}, this.checked)"></td>
            <td>#${product.id}</td>
            <td><img src="${imgSrc}" class="product-img" alt="${escapeHtml(product.name)}" onerror="this.src='${PLACEHOLDER_IMG}'"></td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.category)}</td>
            <td>${formatRupiah(product.price)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editProduct(${product.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn-delete" onclick="deleteProduct(${product.id})"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    updateStats();
    updateBulkDeleteBar();
}

function updateStats() {
    const statTotal = document.getElementById('statTotalProducts');
    const statCategories = document.getElementById('statTotalCategories');
    const statAvgPrice = document.getElementById('statAvgPrice');

    if (statTotal) statTotal.innerText = PRODUCTS.length;

    if (statCategories) {
        const categories = new Set(PRODUCTS.map(p => p.category));
        statCategories.innerText = categories.size;
    }

    if (statAvgPrice) {
        const avg = PRODUCTS.length ? Math.round(PRODUCTS.reduce((sum, p) => sum + p.price, 0) / PRODUCTS.length) : 0;
        statAvgPrice.innerText = formatRupiah(avg);
    }
}

/* ==================== MODAL TAMBAH / EDIT ==================== */
function populateCategoryOptions(selected) {
    const select = document.getElementById('productCategory');
    if (!select) return;
    const categories = Object.keys(CATEGORY_SLUGS);
    select.innerHTML = categories.map(cat =>
        `<option value="${cat}" ${cat === selected ? 'selected' : ''}>${cat}</option>`
    ).join('');
}

/* Tampilkan/sembunyikan pesan error di form modal produk. */
function showFormError(message) {
    const el = document.getElementById('formError');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
}

function clearFormError() {
    const el = document.getElementById('formError');
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
}

function openModal(mode, id = null) {
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');

    clearFormError();
    resetPendingPhotos();
    modal.style.display = 'flex';

    if (mode === 'edit' && id !== null) {
        modalTitle.innerText = "Edit Produk";
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productMaterial').value = product.material || '';
            document.getElementById('productColor').value = product.color || '';
            document.getElementById('productDimensions').value = product.dimensions || '';
            document.getElementById('productDescription').value = product.description || '';
            populateCategoryOptions(product.category);
        }
    } else {
        modalTitle.innerText = "Tambah Produk Baru";
        form.reset();
        document.getElementById('productId').value = '';
        populateCategoryOptions(null);
    }
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

/* ==================== SIMPAN (CREATE / UPDATE) ==================== */
function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function makeUniqueSlug(baseSlug, excludeId) {
    let slug = baseSlug || 'produk';
    let counter = 2;
    while (PRODUCTS.some(p => p.slug === slug && p.id !== excludeId)) {
        slug = baseSlug + '-' + counter;
        counter++;
    }
    return slug;
}

/* Validasi data form produk sebelum disimpan ke PRODUCTS.
   Mengembalikan pesan error (string) apabila ada masalah, atau
   null kalau semua data valid. Dijalankan di JS supaya tidak
   bisa dilewati hanya dengan mengandalkan atribut HTML
   (required, min, dsb.) yang bisa saja gagal tervalidasi
   browser atau di-bypass. */
function validateProductForm(data) {
    if (!data.name) {
        return "Nama produk tidak boleh kosong.";
    }
    if (data.name.length > 100) {
        return "Nama produk maksimal 100 karakter.";
    }
    if (!data.category || !CATEGORY_SLUGS.hasOwnProperty(data.category)) {
        return "Pilih kategori yang valid.";
    }
    if (!Number.isFinite(data.price) || data.price <= 0) {
        return "Harga harus berupa angka lebih besar dari 0.";
    }
    if (data.price > 1000000000) {
        return "Harga tidak masuk akal (maksimal Rp 1.000.000.000).";
    }
    if (!data.material) {
        return "Material tidak boleh kosong.";
    }
    if (!data.color) {
        return "Warna tidak boleh kosong.";
    }
    if (!data.dimensions) {
        return "Dimensi tidak boleh kosong.";
    }
    if (!data.description) {
        return "Deskripsi tidak boleh kosong.";
    }
    if (data.description.length > 500) {
        return "Deskripsi maksimal 500 karakter.";
    }
    return null;
}

async function saveProduct(event) {
    event.preventDefault();
    clearFormError();

    // Kalau ada foto yang menunggu diunggah tapi folder project belum
    // terhubung, hentikan dulu di sini — supaya foto tidak "hilang diam-diam"
    // (data produk tersimpan tapi fotonya tidak pernah tertulis ke disk).
    if (pendingPhotoBlobs.length > 0 && !projectFolderHandle) {
        showFormError('Ada foto yang belum tersimpan: hubungkan folder project dulu (tombol di kanan atas), atau hapus foto dan unggah manual nanti.');
        return;
    }

    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const priceRaw = document.getElementById('productPrice').value.trim();
    const price = priceRaw === '' ? NaN : Number(priceRaw);
    const material = document.getElementById('productMaterial').value.trim();
    const color = document.getElementById('productColor').value.trim();
    const dimensions = document.getElementById('productDimensions').value.trim();
    const description = document.getElementById('productDescription').value.trim();

    const errorMessage = validateProductForm({ name, category, price, material, color, dimensions, description });
    if (errorMessage) {
        showFormError(errorMessage);
        return;
    }
    const finalPrice = Math.round(price);

    if (id) {
        // Edit produk yang ada.
        // PENTING: slug produk yang sudah ada TIDAK diubah otomatis di sini,
        // walaupun namanya diedit. Foto produk disimpan manual di folder
        // asset/images/products/<slug>/, jadi kalau slug ikut berubah saat
        // nama diedit, koneksi ke foto yang sudah diunggah akan putus.
        const index = PRODUCTS.findIndex(p => p.id === parseInt(id, 10));
        if (index !== -1) {
            const existing = PRODUCTS[index];
            PRODUCTS[index] = {
                ...existing,
                name, category, price: finalPrice, material, color, dimensions, description
            };
            rebuildProductImages(PRODUCTS[index]);
        }
    } else {
        // Tambah produk baru — ID selalu naik dan tidak pernah dipakai
        // ulang, walaupun ada produk lama yang sudah dihapus (lihat
        // getNextProductId di asset/js/products.js).
        const newId = getNextProductId();
        const slug = makeUniqueSlug(slugify(name), null);
        const newProduct = { id: newId, name, category, price: finalPrice, description, material, color, dimensions, slug };
        rebuildProductImages(newProduct);
        PRODUCTS.push(newProduct);
    }

    // Tentukan slug produk yang baru saja disimpan (untuk lokasi folder foto).
    const savedSlug = id
        ? PRODUCTS.find(p => p.id === parseInt(id, 10))?.slug
        : PRODUCTS[PRODUCTS.length - 1].slug;

    // PENTING — urutan di bawah ini disengaja:
    // localStorage ditulis & tabel di-render DULU, SEBELUM ada file apa pun
    // ditulis ke folder project. Kalau folder itu sedang dipantau Live Server
    // (atau tool sejenis), menulis foto/products.js ke dalamnya memicu
    // auto-reload halaman — dan reload menghapus semua state JS yang belum
    // sempat disimpan. Dengan localStorage ditulis di awal, produk baru tetap
    // aman & tetap tampil di dashboard walau reload itu terjadi di tengah
    // proses penulisan foto/products.js di bawah.
    persistProducts();
    renderProducts();

    if (pendingPhotoBlobs.length > 0 && savedSlug) {
        try {
            await writePhotosToProjectFolder(savedSlug);
        } catch (e) {
            console.error('Gagal menyimpan foto:', e);
            showFormError('Produk tersimpan, tapi foto GAGAL ditulis ke folder: ' + e.message);
            return;
        }
    }

    try {
        await writeProductsFileToProjectFolder();
    } catch (e) {
        console.error('Gagal menulis products.js:', e);
        showFormError('Produk tersimpan di browser, tapi GAGAL ditulis ke asset/js/products.js: ' + e.message + ' — data belum siap di-push ke GitHub.');
        return;
    }

    resetPendingPhotos();
    closeModal();
}

async function deleteProduct(id) {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
        const index = PRODUCTS.findIndex(p => p.id === id);
        if (index !== -1) PRODUCTS.splice(index, 1);
        selectedProductIds.delete(id);
        persistProducts();

        try {
            await writeProductsFileToProjectFolder();
        } catch (e) {
            console.error('Gagal menulis products.js:', e);
            alert('Produk terhapus di browser, tapi GAGAL ditulis ke asset/js/products.js: ' + e.message + ' — data belum siap di-push ke GitHub.');
        }

        renderProducts();
    }
}

function editProduct(id) {
    openModal('edit', id);
}

/* ==================== INISIALISASI ==================== */
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    if (typeof PRODUCTS !== 'undefined') {
        populateCategoryFilterOptions();
        renderProducts();
    }
    restoreProjectFolder();
});
