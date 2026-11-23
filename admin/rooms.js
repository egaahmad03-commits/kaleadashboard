/* Pengelolaan ruangan, foto sampul, serta urutan kategori yang tampil. */
const ROOM_IMAGE_BUCKET = 'category-images';
let ADMIN_ROOMS = [];
let selectedRoomCategoryIds = [];
let pendingRoomPhoto = null;
let roomPhotoRemoved = false;
let draggedRoomCategory = null;

function roomFallbackImage(slug) {
    const prefix = typeof window.KALEA_ASSET_PREFIX === 'string' ? window.KALEA_ASSET_PREFIX : '../';
    const files = { 'ruang-tamu': 'catalog-hero.png', 'ruang-makan': 'hero-dining.png', 'kamar-tidur': 'hero-bedroom.png', 'ruang-kerja': 'hero-work.png', 'area-outdoor': 'hero-outdoor.png' };
    return prefix + 'asset/images/' + (files[slug] || 'catalog-hero.png');
}

async function loadAdminRooms() {
    const body = document.getElementById('roomTableBody');
    if (!body) return;
    const { data, error } = await supabaseClient.from('rooms').select('*').order('sort_order', { ascending: true });
    if (error) {
        body.innerHTML = '<tr><td colspan="5" class="room-form-error">Data ruangan belum tersedia. Jalankan migrasi database ruangan di Supabase.</td></tr>';
        return;
    }
    ADMIN_ROOMS = data || [];
    const links = await Promise.all(ADMIN_ROOMS.map(room => supabaseClient.from('room_categories').select('category_id').eq('room_id', room.id)));
    const missingCategoryMap = links.find(result => result.error);
    if (missingCategoryMap) {
        body.innerHTML = '<tr><td colspan="5" class="room-form-error">Ruangan sudah ada, tetapi daftar kategori per ruangan belum dibuat. Jalankan ulang supabase_rooms_migration.sql di Supabase.</td></tr>';
        return;
    }
    ADMIN_ROOMS.forEach((room, index) => { room.category_count = (links[index].data || []).length; });
    renderAdminRooms();
}

function renderAdminRooms() {
    const body = document.getElementById('roomTableBody');
    if (!body) return;
    if (!ADMIN_ROOMS.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">Belum ada ruangan. Tambahkan ruangan untuk mulai mengatur katalog.</td></tr>';
        return;
    }
    body.innerHTML = ADMIN_ROOMS.map((room, index) => `<tr>
        <td><img class="room-thumb" src="${escapeHtml(room.image_url || roomFallbackImage(room.slug))}" alt="${escapeHtml(room.name)}"></td>
        <td><strong>${escapeHtml(room.name)}</strong><br><small>${escapeHtml(room.description || '')}</small></td>
        <td>${room.category_count || 0} kategori</td><td>${index + 1}</td>
        <td><div class="action-btns"><button class="btn-edit" onclick="editRoom('${room.id}')"><i class="fa-solid fa-pen"></i> Atur</button><button class="btn-delete" onclick="deleteRoom('${room.id}')"><i class="fa-solid fa-trash"></i> Hapus</button></div></td>
    </tr>`).join('');
}

function resetRoomPhoto() {
    if (pendingRoomPhoto && !pendingRoomPhoto.isExisting) URL.revokeObjectURL(pendingRoomPhoto.previewUrl);
    pendingRoomPhoto = null;
    roomPhotoRemoved = false;
    const preview = document.getElementById('roomPhotoPreview');
    if (preview) preview.innerHTML = '';
    const input = document.getElementById('roomPhotoInput');
    if (input) input.value = '';
}

async function handleRoomPhotoSelected(files) {
    const file = Array.from(files || []).find(item => item.type.startsWith('image/'));
    if (!file) return;
    try {
        const blob = await convertImageFileToJpeg(file);
        resetRoomPhoto();
        pendingRoomPhoto = { blob, previewUrl: URL.createObjectURL(blob), isExisting: false };
        renderRoomPhotoPreview();
    } catch (error) { alert(error.message); }
    const input = document.getElementById('roomPhotoInput');
    if (input) input.value = '';
}

function renderRoomPhotoPreview() {
    const preview = document.getElementById('roomPhotoPreview');
    if (!preview) return;
    preview.innerHTML = pendingRoomPhoto
        ? `<div class="photo-preview-item"><img src="${escapeHtml(pendingRoomPhoto.previewUrl)}" alt="Preview foto ruangan"><button type="button" class="photo-preview-remove" onclick="removeRoomPhoto()">&times;</button></div>`
        : '';
}

function removeRoomPhoto() {
    if (pendingRoomPhoto && !pendingRoomPhoto.isExisting) URL.revokeObjectURL(pendingRoomPhoto.previewUrl);
    pendingRoomPhoto = null;
    roomPhotoRemoved = true;
    renderRoomPhotoPreview();
    const input = document.getElementById('roomPhotoInput');
    if (input) input.value = '';
}

function openRoomModal(id) {
    const form = document.getElementById('roomForm');
    form.reset();
    resetRoomPhoto();
    document.getElementById('roomFormError').hidden = true;
    document.getElementById('roomId').value = id || '';
    selectedRoomCategoryIds = [];
    const room = id ? ADMIN_ROOMS.find(item => String(item.id) === String(id)) : null;
    document.getElementById('roomModalTitle').textContent = room ? 'Edit Ruangan' : 'Tambah Ruangan';
    if (room) {
        document.getElementById('roomName').value = room.name;
        document.getElementById('roomDescription').value = room.description || '';
        if (room.image_url) {
            pendingRoomPhoto = { isExisting: true, existingUrl: room.image_url, previewUrl: room.image_url };
            renderRoomPhotoPreview();
        }
    }
    document.getElementById('roomCategorySearch').value = '';
    document.getElementById('roomModal').style.display = 'flex';
    (async () => {
        if (room) {
            const { data, error } = await supabaseClient.from('room_categories').select('category_id, sort_order').eq('room_id', room.id).order('sort_order', { ascending: true });
            if (error) { showRoomError(error.message); return; }
            selectedRoomCategoryIds = (data || []).map(item => String(item.category_id));
        }
        renderRoomCategoryPicker();
        renderSelectedRoomCategories();
    })();
}

function editRoom(id) { openRoomModal(id); }
function closeRoomModal() {
    document.getElementById('roomModal').style.display = 'none';
    resetRoomPhoto();
}

function roomCategoryThumb(category) {
    if (category.display_mode === 'image' && category.image_url) return `<img src="${escapeHtml(category.image_url)}" alt="" loading="lazy">`;
    return `<span class="room-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${category.icon_svg || GENERIC_CATEGORY_ICON}</svg></span>`;
}

function renderRoomCategoryPicker() {
    const picker = document.getElementById('roomCategoryPicker');
    if (!picker) return;
    const search = (document.getElementById('roomCategorySearch').value || '').trim().toLowerCase();
    const visible = CATEGORIES.filter(category => !search || category.name.toLowerCase().includes(search) || category.slug.toLowerCase().includes(search));
    picker.innerHTML = visible.map(category => `<label class="room-product-option">
        <input type="checkbox" value="${escapeHtml(category.id)}" ${selectedRoomCategoryIds.includes(String(category.id)) ? 'checked' : ''} onchange="toggleRoomCategory('${escapeHtml(category.id)}', this.checked)">
        ${roomCategoryThumb(category)}<span>${escapeHtml(category.name)}</span>
    </label>`).join('') || '<p style="padding:10px;color:var(--text-muted);">Kategori tidak ditemukan.</p>';
}

function toggleRoomCategory(id, checked) {
    const categoryId = String(id);
    if (checked && !selectedRoomCategoryIds.includes(categoryId)) selectedRoomCategoryIds.push(categoryId);
    if (!checked) selectedRoomCategoryIds = selectedRoomCategoryIds.filter(value => value !== categoryId);
    renderSelectedRoomCategories();
}

function renderSelectedRoomCategories() {
    const list = document.getElementById('roomSelectedCategories');
    const selected = selectedRoomCategoryIds.map(id => CATEGORIES.find(category => String(category.id) === id)).filter(Boolean);
    list.innerHTML = selected.map((category, index) => `<li class="room-selected-product" draggable="true" data-category-id="${escapeHtml(category.id)}">
        <span class="room-drag-handle" aria-label="Seret untuk mengurutkan"><i class="fa-solid fa-grip-vertical"></i> ${index + 1}</span>
        ${roomCategoryThumb(category)}<span class="room-product-name">${escapeHtml(category.name)}</span>
        <button class="btn-delete" type="button" aria-label="Hapus kategori dari ruangan" onclick="toggleRoomCategory('${escapeHtml(category.id)}', false); renderRoomCategoryPicker();"><i class="fa-solid fa-xmark"></i></button>
    </li>`).join('') || '<li class="room-admin-muted">Belum ada kategori dipilih.</li>';
    list.querySelectorAll('.room-selected-product').forEach(item => {
        item.addEventListener('dragstart', () => { draggedRoomCategory = item; item.classList.add('is-dragging'); });
        item.addEventListener('dragend', () => { item.classList.remove('is-dragging'); draggedRoomCategory = null; updateRoomCategoryOrderFromDom(); });
        item.addEventListener('dragover', event => {
            event.preventDefault();
            if (!draggedRoomCategory || draggedRoomCategory === item) return;
            const rect = item.getBoundingClientRect();
            list.insertBefore(draggedRoomCategory, event.clientY < rect.top + rect.height / 2 ? item : item.nextSibling);
        });
    });
}

function updateRoomCategoryOrderFromDom() {
    selectedRoomCategoryIds = Array.from(document.querySelectorAll('#roomSelectedCategories [data-category-id]')).map(item => String(item.dataset.categoryId));
    renderSelectedRoomCategories();
}

function showRoomError(message) {
    const error = document.getElementById('roomFormError');
    error.textContent = message;
    error.hidden = false;
}

async function saveRoom(event) {
    event.preventDefault();
    const button = document.getElementById('roomSaveBtn');
    const id = document.getElementById('roomId').value;
    const name = document.getElementById('roomName').value.trim();
    const description = document.getElementById('roomDescription').value.trim();
    const existing = id ? ADMIN_ROOMS.find(item => String(item.id) === String(id)) : null;
    if (!name) return showRoomError('Nama ruangan harus diisi.');
    button.disabled = true;
    try {
        const slug = existing ? existing.slug : slugify(name);
        let imageUrl = roomPhotoRemoved ? null : (pendingRoomPhoto ? (pendingRoomPhoto.isExisting ? pendingRoomPhoto.existingUrl : null) : (existing ? existing.image_url : null));
        if (pendingRoomPhoto && !pendingRoomPhoto.isExisting) {
            const path = `rooms/${slug}/cover-${Date.now()}.jpg`;
            const { error: uploadError } = await supabaseClient.storage.from(ROOM_IMAGE_BUCKET).upload(path, pendingRoomPhoto.blob, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
            imageUrl = supabaseClient.storage.from(ROOM_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
        }
        const payload = { name, slug, description, image_url: imageUrl, is_active: true };
        if (existing) {
            const { error } = await supabaseClient.from('rooms').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            payload.sort_order = ADMIN_ROOMS.length + 1;
            const { data, error } = await supabaseClient.from('rooms').insert(payload).select('id').single();
            if (error) throw error;
            document.getElementById('roomId').value = data.id;
        }
        const roomId = document.getElementById('roomId').value;
        const { error: deleteError } = await supabaseClient.from('room_categories').delete().eq('room_id', roomId);
        if (deleteError) throw deleteError;
        if (selectedRoomCategoryIds.length) {
            const rows = selectedRoomCategoryIds.map((categoryId, sortOrder) => ({ room_id: roomId, category_id: categoryId, sort_order: sortOrder + 1 }));
            const { error } = await supabaseClient.from('room_categories').insert(rows);
            if (error) throw error;
        }
        closeRoomModal();
        await loadAdminRooms();
    } catch (error) {
        console.error('Gagal menyimpan ruangan:', error);
        showRoomError('Gagal menyimpan: ' + error.message);
    } finally { button.disabled = false; }
}

async function deleteRoom(id) {
    const room = ADMIN_ROOMS.find(item => String(item.id) === String(id));
    if (!room || !confirm(`Hapus ruangan "${room.name}" dari katalog?`)) return;
    const { error } = await supabaseClient.from('rooms').delete().eq('id', id);
    if (error) { alert('Gagal menghapus ruangan: ' + error.message); return; }
    await loadAdminRooms();
}

document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('roomPhotoDropzone');
    if (!dropzone) return;
    ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('is-dragover'); }));
    dropzone.addEventListener('drop', event => handleRoomPhotoSelected(event.dataTransfer.files));
});
