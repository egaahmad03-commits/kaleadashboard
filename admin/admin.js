/* =========================================================
   Kalea Furniture — Admin Panel
   - Login lewat Supabase Auth (bukan lagi client-side hardcode)
   - Data produk & kategori dibaca/ditulis langsung ke Supabase
     (tabel `products` & `categories`), lindungi lewat RLS:
     publik cuma bisa baca, hanya user yang login (authenticated)
     yang bisa insert/update/delete.
   - Foto produk disimpan di Supabase Storage (bucket
     'product-images'), bukan lagi lewat File System Access API.
     Ini artinya admin panel bisa dipakai untuk tambah/edit produk
     LENGKAP DENGAN FOTO dari browser mana pun, termasuk HP —
     tidak perlu Chrome/Edge desktop, tidak perlu git push untuk
     foto.
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
   Upload & Konversi Foto Produk (Supabase Storage)
   ---------------------------------------------------------
   Foto yang dipilih di form (klik atau drag & drop) langsung
   digambar ulang ke <canvas> lalu di-export sebagai JPEG
   (kualitas 85%, sisi terpanjang dibatasi 1200px), lalu diupload
   ke bucket 'product-images' di Supabase Storage. URL publiknya
   disimpan ke kolom `images` (jsonb) di tabel `products`.
   ========================================================= */
const STORAGE_BUCKET = 'product-images';
const MAX_PRODUCT_PHOTOS = typeof PRODUCT_IMAGE_COUNT !== 'undefined' ? PRODUCT_IMAGE_COUNT : 6;
const PHOTO_MAX_DIMENSION = 1200;
const PHOTO_JPEG_QUALITY = 0.85;

// Setiap item: { blob, previewUrl, isExisting, existingUrl }
// - isExisting=true  -> foto lama yang sudah tersimpan di Storage (dimuat saat Edit)
// - isExisting=false -> foto baru yang baru saja dipilih user, sudah dikonversi ke JPEG blob
let pendingPhotoBlobs = [];

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
    removed.forEach(p => { if (!p.isExisting) URL.revokeObjectURL(p.previewUrl); });
    renderPhotoPreviews();
}

function resetPendingPhotos() {
    pendingPhotoBlobs.forEach(p => { if (!p.isExisting) URL.revokeObjectURL(p.previewUrl); });
    pendingPhotoBlobs = [];
    renderPhotoPreviews();
    const input = document.getElementById('productPhotoInput');
    if (input) input.value = '';
}

/* Muat foto yang SUDAH tersimpan di Supabase Storage (dari kolom
   `images` produk) ke pendingPhotoBlobs saat membuka form Edit Produk,
   supaya tidak tertimpa/hilang kalau user menambah foto baru tanpa
   mengunggah ulang foto lama. Ini jalan dari browser MANA PUN (termasuk
   HP) karena baca dari cloud, bukan folder lokal. */
function loadExistingPhotosIntoPending(product) {
    if (!product || !Array.isArray(product.images)) return;
    product.images.forEach((url) => {
        pendingPhotoBlobs.push({ blob: null, previewUrl: url, isExisting: true, existingUrl: url });
    });
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
            pendingPhotoBlobs.push({ blob: jpegBlob, previewUrl: URL.createObjectURL(jpegBlob), isExisting: false });
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

/* Upload semua foto (baru + yang lama dipertahankan) ke Supabase Storage,
   dengan urutan penomoran 1.jpg, 2.jpg, dst sesuai urutan tampil di form.
   Folder lama untuk slug ini dibersihkan lebih dulu, supaya tidak ada
   file "warisan" dari produk lama yang pernah pakai slug yang sama
   (ini yang dulu menyebabkan foto jadi berlipat / produk lama "muncul lagi"). */
async function uploadPhotosToStorage(slug) {
    const { data: existingFiles, error: listError } = await supabaseClient
        .storage.from(STORAGE_BUCKET).list(slug);
    if (!listError && existingFiles && existingFiles.length > 0) {
        const pathsToRemove = existingFiles.map(f => `${slug}/${f.name}`);
        await supabaseClient.storage.from(STORAGE_BUCKET).remove(pathsToRemove);
    }

    const finalUrls = [];
    for (let i = 0; i < pendingPhotoBlobs.length; i++) {
        const item = pendingPhotoBlobs[i];
        const path = `${slug}/${i + 1}.jpg`;

        let blobToUpload = item.blob;
        if (item.isExisting) {
            const res = await fetch(item.existingUrl);
            blobToUpload = await res.blob();
        }

        const { error: uploadError } = await supabaseClient
            .storage.from(STORAGE_BUCKET)
            .upload(path, blobToUpload, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient
            .storage.from(STORAGE_BUCKET).getPublicUrl(path);
        finalUrls.push(publicUrlData.publicUrl);
    }

    return finalUrls;
}

/* Hapus seluruh folder foto sebuah produk dari Storage (dipanggil saat
   produk dihapus dari admin panel), supaya tidak ada file yatim yang
   nanti "diwarisi" produk baru dengan slug yang sama. */
async function deletePhotosFromStorage(slug) {
    if (!slug) return;
    const { data: files, error: listError } = await supabaseClient
        .storage.from(STORAGE_BUCKET).list(slug);
    if (listError || !files || files.length === 0) return;
    const paths = files.map(f => `${slug}/${f.name}`);
    await supabaseClient.storage.from(STORAGE_BUCKET).remove(paths);
}

/* =========================================================
   Bantuan Menulis Deskripsi
   ---------------------------------------------------------
   1) updateDescCounter    -> counter karakter (maks 500)
   2) insertBulletPoint    -> sisipkan poin "• " di posisi kursor
   3) insertDescTemplate   -> draf otomatis dari Nama/Kategori/
      Material/Warna/Dimensi yang sudah diisi di form
   4) generateDescriptionWithAI -> panggil Supabase Edge Function
      "generate-description" yang meneruskan permintaan ke
      Anthropic API (API key disimpan aman di server, bukan di
      browser). Function ini perlu di-deploy terpisah — lihat
      supabase/functions/generate-description/index.ts.
   ========================================================= */
function updateDescCounter() {
    const textarea = document.getElementById('productDescription');
    const counterEl = document.getElementById('descCounterText');
    if (!textarea || !counterEl) return;
    const len = textarea.value.length;
    counterEl.textContent = len;
    const wrapper = counterEl.parentElement;
    if (wrapper) wrapper.classList.toggle('desc-counter-warning', len > 450);
}

function insertBulletPoint() {
    const textarea = document.getElementById('productDescription');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const insertion = (needsNewline ? '\n' : '') + '• ';

    textarea.value = (before + insertion + after).slice(0, 500);
    const cursorPos = Math.min((before + insertion).length, textarea.value.length);
    textarea.focus();
    textarea.setSelectionRange(cursorPos, cursorPos);
    updateDescCounter();
}

function buildTemplateDescription() {
    const name = document.getElementById('productName').value.trim();
    const material = document.getElementById('productMaterial').value.trim();
    const color = document.getElementById('productColor').value.trim();
    const dimensions = document.getElementById('productDimensions').value.trim();
    const categorySelect = document.getElementById('productCategory');
    const categoryOption = categorySelect && categorySelect.options[categorySelect.selectedIndex];
    const categoryName = categoryOption ? categoryOption.text : '';

    if (!material || !color || !dimensions) {
        alert('Isi dulu Material, Warna, dan Dimensi supaya template deskripsi bisa dibuat.');
        return null;
    }

    const subject = name || categoryName || 'Produk ini';
    const parts = [
        `${subject} hadir dengan material ${material} berkualitas dan warna ${color} yang menawan.`,
        `Dengan dimensi ${dimensions}, cocok untuk melengkapi${categoryName ? ' koleksi ' + categoryName.toLowerCase() + ' Anda' : ' ruangan Anda'}.`,
        'Desain kokoh dan tahan lama, siap mempercantik interior rumah Anda.'
    ];
    return parts.join(' ');
}

function insertDescTemplate() {
    const textarea = document.getElementById('productDescription');
    if (!textarea) return;
    const template = buildTemplateDescription();
    if (!template) return;
    if (textarea.value.trim() && !confirm('Deskripsi sudah terisi. Timpa dengan template otomatis?')) return;

    textarea.value = template.slice(0, 500);
    updateDescCounter();
}

async function generateDescriptionWithAI() {
    const btn = document.getElementById('aiGenerateBtn');
    const textarea = document.getElementById('productDescription');
    if (!btn || !textarea) return;

    const name = document.getElementById('productName').value.trim();
    const material = document.getElementById('productMaterial').value.trim();
    const color = document.getElementById('productColor').value.trim();
    const dimensions = document.getElementById('productDimensions').value.trim();
    const categorySelect = document.getElementById('productCategory');
    const categoryOption = categorySelect && categorySelect.options[categorySelect.selectedIndex];
    const categoryName = categoryOption ? categoryOption.text : '';

    if (!name || !material || !color || !dimensions) {
        alert('Isi dulu Nama, Material, Warna, dan Dimensi supaya AI bisa membuat deskripsi yang akurat.');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuat...';

    try {
        const { data, error } = await supabaseClient.functions.invoke('generate-description', {
            body: { name, material, color, dimensions, category: categoryName }
        });

        if (error) throw error;
        if (!data || !data.description) throw new Error('Respons AI kosong.');

        if (textarea.value.trim() && !confirm('Deskripsi sudah terisi. Timpa dengan hasil AI?')) return;

        textarea.value = data.description.slice(0, 500);
        updateDescCounter();
    } catch (e) {
        console.error('Gagal generate deskripsi AI:', e);
        alert(
            'Gagal membuat deskripsi dengan AI: ' + e.message +
            '\n\nPastikan Edge Function "generate-description" sudah di-deploy di Supabase ' +
            'dan secret ANTHROPIC_API_KEY sudah diset. Sementara itu, coba pakai "Template Otomatis".'
        );
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
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
    const productsToDelete = PRODUCTS.filter(p => ids.includes(p.id));

    const { error } = await supabaseClient.from('products').delete().in('id', ids);

    if (error) {
        console.error('Gagal menghapus produk:', error);
        alert('Gagal menghapus produk: ' + error.message);
        return;
    }

    // Bersihkan juga foto masing-masing produk dari Storage.
    for (const p of productsToDelete) {
        try { await deletePhotosFromStorage(p.slug); }
        catch (e) { console.warn('Gagal menghapus foto dari Storage untuk', p.slug, e); }
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

            loadExistingPhotosIntoPending(product);
            renderPhotoPreviews();
        }
    } else {
        modalTitle.innerText = "Tambah Produk Baru";
        form.reset();
        document.getElementById('productId').value = '';
        populateCategoryOptions(null);
    }

    updateDescCounter();
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
            // foto produk terhubung ke folder di Storage lewat slug ini,
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
            const imageUrls = await uploadPhotosToStorage(savedSlug);
            const { error: imgError } = await supabaseClient.from('products')
                .update({ images: imageUrls }).eq('slug', savedSlug);
            if (imgError) throw imgError;
        } catch (e) {
            console.error('Gagal menyimpan foto:', e);
            showFormError('Produk tersimpan di database, tapi foto GAGAL diupload: ' + e.message);
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

    const product = PRODUCTS.find(p => p.id === id);

    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        console.error('Gagal menghapus produk:', error);
        alert('Gagal menghapus produk: ' + error.message);
        return;
    }

    if (product && product.slug) {
        try { await deletePhotosFromStorage(product.slug); }
        catch (e) { console.warn('Gagal menghapus foto dari Storage:', e); }
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
});
