/* =========================================================
   Kalea Furniture — Admin Panel
   - Login lewat Supabase Auth (bukan lagi client-side hardcode)
   - Data produk & kategori dibaca/ditulis langsung ke Supabase
     (tabel `products` & `categories`), lindungi lewat RLS:
     publik cuma bisa baca, hanya user yang login (authenticated)
     yang bisa insert/update/delete.
   - Foto produk TETAP file statis di asset/images/products/<slug>/,
     ditulis lewat File System Access API (folder project yang
     dihubungkan sekali di kanan atas dashboard).
   ========================================================= */

/* ==================== LOGIN (Supabase Auth) ==================== */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (errorEl) errorEl.style.display = 'none';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk Sekarang'; }

    if (error) {
        if (errorEl) {
            errorEl.textContent = "Email atau password salah.";
            errorEl.style.display = "block";
        }
        return;
    }

    window.location.href = "admin.html";
}

async function handleLogout(event) {
    if (event) event.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

// Lindungi halaman dashboard: lempar ke login jika belum masuk.
// Mengembalikan session (truthy) kalau valid, atau null (dan sudah
// redirect) kalau tidak.
async function requireAuth() {
    if (!document.getElementById('productTableBody')) return null; // bukan halaman dashboard

    const { data } = await supabaseClient.auth.getSession();
    const session = data && data.session;

    if (!session) {
        window.location.href = "login.html";
        return null;
    }

    const userLabel = document.getElementById('loggedInUser');
    if (userLabel) userLabel.textContent = session.user.email;
    return session;
}

/* =========================================================
   Koneksi Folder Project (File System Access API)
   ---------------------------------------------------------
   Dipakai HANYA untuk menyimpan foto produk sebagai file statis
   ke asset/images/products/<slug>/ di folder project (hasil clone
   repo GitHub) — data produk sendiri (nama, harga, dst) sudah
   langsung tersimpan ke Supabase begitu form disimpan, tidak lagi
   lewat folder ini.

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
    label.textContent = connected ? 'Folder Foto Terhubung' : 'Hubungkan Folder untuk Foto';
    if (note) note.textContent = message || '';
}

async function restoreProjectFolder() {
    if (!FS_SUPPORTED) {
        setFolderStatus(false, 'Fitur unggah foto otomatis butuh Chrome/Edge, dan halaman dibuka lewat http://localhost (bukan double-click file HTML). Tanpa ini, foto perlu ditambahkan manual ke folder asset/images/products/<slug>/.');
        return;
    }
    const handle = await idbLoadFolderHandle();
    if (!handle) {
        setFolderStatus(false, 'Belum terhubung ke folder project. Klik tombol di kanan atas agar foto produk otomatis tersimpan ke folder repo Anda.');
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
   (kualitas 85%, sisi terpanjang dibatasi 1200px).
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

/* Muat foto yang SUDAH tersimpan di folder project ke pendingPhotoBlobs
   saat membuka form Edit Produk, supaya tidak tertimpa/hilang kalau user
   menambah foto baru tanpa mengunggah ulang foto lama. */
async function loadExistingPhotosIntoPending(product) {
    if (!product || !product.slug || !projectFolderHandle) return;

    try {
        const perm = await projectFolderHandle.queryPermission({ mode: 'read' });
        if (perm === 'denied') return;

        const assetDir = await projectFolderHandle.getDirectoryHandle('asset');
        const imagesDir = await assetDir.getDirectoryHandle('images');
        const productsDir = await imagesDir.getDirectoryHandle('products');
        const slugDir = await productsDir.getDirectoryHandle(product.slug);

        for (let i = 1; i <= MAX_PRODUCT_PHOTOS; i++) {
            try {
                const fileHandle = await slugDir.getFileHandle(i + '.jpg');
                const file = await fileHandle.getFile();
                pendingPhotoBlobs.push({ blob: file, previewUrl: URL.createObjectURL(file) });
            } catch (e) {
                break; // nomor foto ini tidak ada -> foto berikutnya juga tidak ada (urutan selalu rapat)
            }
        }
    } catch (e) {
        // Folder foto produk ini belum ada (produk lama tanpa foto tersimpan) — aman diabaikan.
    }
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

/* ==================== RENDER TABEL PRODUK ==================== */
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><rect width="45" height="45" fill="#e2e8f0"/></svg>'
);

let currentCategoryFilter = "all";
let selectedProductIds = new Set();

function populateCategoryFilterOptions() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    select.innerHTML = '<option value="all">Semua Kategori</option>' +
        CATEGORIES.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
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
    return PRODUCTS.filter(p => String(p.category_id) === String(currentCategoryFilter));
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

    const ids = Array.from(selectedProductIds);
    const { error } = await supabaseClient.from('products').delete().in('id', ids);

    if (error) {
        console.error('Gagal menghapus produk:', error);
        alert('Gagal menghapus produk: ' + error.message);
        return;
    }

    selectedProductIds.clear();
    invalidateCatalogCache();
    await loadCatalogData();
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
    if (statCategories) statCategories.innerText = CATEGORIES.length;

    if (statAvgPrice) {
        const avg = PRODUCTS.length ? Math.round(PRODUCTS.reduce((sum, p) => sum + p.price, 0) / PRODUCTS.length) : 0;
        statAvgPrice.innerText = formatRupiah(avg);
    }
}

/* ==================== MODAL TAMBAH / EDIT PRODUK ==================== */
function populateCategoryOptions(selectedId) {
    const select = document.getElementById('productCategory');
    if (!select) return;
    select.innerHTML = CATEGORIES.map(c =>
        `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');
}

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

async function openModal(mode, id = null) {
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    const status = document.getElementById('photoStatusNote');

    if (CATEGORIES.length === 0) {
        alert('Belum ada kategori. Tambahkan kategori dulu di menu "Kategori" sebelum menambah produk.');
        return;
    }

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
            populateCategoryOptions(product.category_id);

            if (projectFolderHandle) {
                if (status) status.textContent = 'Memuat foto yang sudah tersimpan...';
                await loadExistingPhotosIntoPending(product);
                renderPhotoPreviews();
            } else if (status) {
                status.textContent = 'Folder project belum terhubung, jadi foto lama produk ini tidak bisa ditampilkan di sini. Hubungkan folder project dulu (tombol di kanan atas) sebelum menambah/mengganti foto, supaya foto lama tidak tertimpa.';
            }
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

/* ==================== SIMPAN (CREATE / UPDATE) PRODUK ==================== */
function makeUniqueSlug(baseSlug, excludeId) {
    let slug = baseSlug || 'produk';
    let counter = 2;
    while (PRODUCTS.some(p => p.slug === slug && p.id !== excludeId)) {
        slug = baseSlug + '-' + counter;
        counter++;
    }
    return slug;
}

function validateProductForm(data) {
    if (!data.name) return "Nama produk tidak boleh kosong.";
    if (data.name.length > 100) return "Nama produk maksimal 100 karakter.";
    if (!data.category_id) return "Pilih kategori yang valid.";
    if (!Number.isFinite(data.price) || data.price <= 0) return "Harga harus berupa angka lebih besar dari 0.";
    if (data.price > 1000000000) return "Harga tidak masuk akal (maksimal Rp 1.000.000.000).";
    if (!data.material) return "Material tidak boleh kosong.";
    if (!data.color) return "Warna tidak boleh kosong.";
    if (!data.dimensions) return "Dimensi tidak boleh kosong.";
    if (!data.description) return "Deskripsi tidak boleh kosong.";
    if (data.description.length > 500) return "Deskripsi maksimal 500 karakter.";
    return null;
}

async function saveProduct(event) {
    event.preventDefault();
    clearFormError();

    if (pendingPhotoBlobs.length > 0 && !projectFolderHandle) {
        showFormError('Ada foto yang belum tersimpan: hubungkan folder project dulu (tombol di kanan atas), atau hapus foto dan unggah manual nanti.');
        return;
    }

    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const category_id = document.getElementById('productCategory').value;
    const priceRaw = document.getElementById('productPrice').value.trim();
    const price = priceRaw === '' ? NaN : Number(priceRaw);
    const material = document.getElementById('productMaterial').value.trim();
    const color = document.getElementById('productColor').value.trim();
    const dimensions = document.getElementById('productDimensions').value.trim();
    const description = document.getElementById('productDescription').value.trim();

    const errorMessage = validateProductForm({ name, category_id, price, material, color, dimensions, description });
    if (errorMessage) {
        showFormError(errorMessage);
        return;
    }
    const finalPrice = Math.round(price);

    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    let savedSlug = null;

    try {
        if (id) {
            // Edit produk. Slug TIDAK diubah otomatis walau nama diedit —
            // foto produk disimpan manual di folder asset/images/products/<slug>/,
            // jadi kalau slug ikut berubah, koneksi ke foto yang sudah
            // diunggah akan putus.
            const existing = PRODUCTS.find(p => p.id === parseInt(id, 10));
            savedSlug = existing ? existing.slug : null;

            const { error } = await supabaseClient.from('products').update({
                name, category_id, price: finalPrice, material, color, dimensions, description
            }).eq('id', id);

            if (error) throw error;
        } else {
            const slug = makeUniqueSlug(slugify(name), null);
            const { data, error } = await supabaseClient.from('products').insert([{
                name, category_id, price: finalPrice, material, color, dimensions, description, slug
            }]).select().single();

            if (error) throw error;
            savedSlug = data.slug;
        }
    } catch (e) {
        console.error('Gagal menyimpan produk:', e);
        showFormError('Gagal menyimpan produk ke database: ' + e.message);
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    if (pendingPhotoBlobs.length > 0 && savedSlug) {
        try {
            await writePhotosToProjectFolder(savedSlug);
        } catch (e) {
            console.error('Gagal menyimpan foto:', e);
            showFormError('Produk tersimpan di database, tapi foto GAGAL ditulis ke folder: ' + e.message);
            if (submitBtn) submitBtn.disabled = false;
            return;
        }
    }

    invalidateCatalogCache();
    await loadCatalogData();
    renderProducts();
    resetPendingPhotos();
    closeModal();
    if (submitBtn) submitBtn.disabled = false;
}

async function deleteProduct(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;

    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        console.error('Gagal menghapus produk:', error);
        alert('Gagal menghapus produk: ' + error.message);
        return;
    }

    selectedProductIds.delete(id);
    invalidateCatalogCache();
    await loadCatalogData();
    renderProducts();
}

function editProduct(id) {
    openModal('edit', id);
}

/* ==================== KATEGORI ==================== */
function renderCategoryTable() {
    const tableBody = document.getElementById('categoryTableBody');
    if (!tableBody) return;

    if (CATEGORIES.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px;">Belum ada kategori.</td></tr>';
        return;
    }

    tableBody.innerHTML = CATEGORIES.map(c => {
        const count = PRODUCTS.filter(p => String(p.category_id) === String(c.id)).length;
        return `
            <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.slug)}</td>
                <td>${count}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-delete" onclick="deleteCategory('${c.id}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openCategoryModal() {
    document.getElementById('categoryForm').reset();
    const errEl = document.getElementById('categoryFormError');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

async function saveCategory(event) {
    event.preventDefault();
    const errEl = document.getElementById('categoryFormError');
    if (errEl) errEl.style.display = 'none';

    const name = document.getElementById('categoryName').value.trim();
    if (!name) {
        if (errEl) { errEl.textContent = 'Nama kategori tidak boleh kosong.'; errEl.style.display = 'block'; }
        return;
    }
    if (name.length > 50) {
        if (errEl) { errEl.textContent = 'Nama kategori maksimal 50 karakter.'; errEl.style.display = 'block'; }
        return;
    }

    const slug = slugify(name);
    const saveBtn = document.getElementById('categorySaveBtn');
    if (saveBtn) saveBtn.disabled = true;

    const { error } = await supabaseClient.from('categories').insert([{
        name, slug, sort_order: CATEGORIES.length + 1
    }]);

    if (saveBtn) saveBtn.disabled = false;

    if (error) {
        console.error('Gagal menambah kategori:', error);
        const message = (error.code === '23505')
            ? 'Kategori dengan nama/slug yang sama sudah ada.'
            : 'Gagal menambah kategori: ' + error.message;
        if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
        return;
    }

    invalidateCatalogCache();
    await loadCatalogData();
    renderCategoryTable();
    populateCategoryFilterOptions();
    closeCategoryModal();
}

async function deleteCategory(id) {
    const count = PRODUCTS.filter(p => String(p.category_id) === String(id)).length;
    if (count > 0) {
        alert(`Kategori ini masih punya ${count} produk. Pindahkan atau hapus produk-produk itu dulu (lewat menu Produk) sebelum menghapus kategorinya.`);
        return;
    }
    if (!confirm('Hapus kategori ini? Tindakan ini tidak bisa dibatalkan.')) return;

    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) {
        console.error('Gagal menghapus kategori:', error);
        alert('Gagal menghapus kategori: ' + error.message);
        return;
    }

    invalidateCatalogCache();
    await loadCatalogData();
    renderCategoryTable();
    populateCategoryFilterOptions();
    if (currentCategoryFilter === String(id)) {
        currentCategoryFilter = 'all';
    }
    renderProducts();
}

/* ==================== INISIALISASI ==================== */
document.addEventListener('DOMContentLoaded', async () => {
    const session = await requireAuth();
    if (!session) return; // sudah diarahkan ke login.html

    try {
        await loadCatalogData();
    } catch (e) {
        console.error('Gagal memuat data dari Supabase:', e);
        alert('Gagal memuat data dari Supabase: ' + e.message);
    }

    populateCategoryFilterOptions();
    renderProducts();
    renderCategoryTable();
    restoreProjectFolder();
});
