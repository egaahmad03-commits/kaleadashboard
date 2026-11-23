-- Katalog berbasis ruangan: ruangan, foto sampul, dan urutan produk per ruangan.
-- Jalankan di Supabase Dashboard > SQL Editor setelah schema utama tersedia.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.room_products (
  room_id uuid not null references public.rooms(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (room_id, product_id)
);

-- Ruangan pada katalog menampilkan kategori terlebih dahulu, bukan setiap produk.
create table if not exists public.room_categories (
  room_id uuid not null references public.rooms(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (room_id, category_id)
);

alter table public.rooms enable row level security;
alter table public.room_products enable row level security;
alter table public.room_categories enable row level security;

drop policy if exists "Publik boleh membaca ruangan" on public.rooms;
create policy "Publik boleh membaca ruangan" on public.rooms
  for select to anon, authenticated using (true);
drop policy if exists "Admin boleh mengelola ruangan" on public.rooms;
create policy "Admin boleh mengelola ruangan" on public.rooms
  for all to authenticated using (true) with check (true);

drop policy if exists "Publik boleh membaca produk per ruangan" on public.room_products;
create policy "Publik boleh membaca produk per ruangan" on public.room_products
  for select to anon, authenticated using (true);
drop policy if exists "Admin boleh mengelola produk per ruangan" on public.room_products;
create policy "Admin boleh mengelola produk per ruangan" on public.room_products
  for all to authenticated using (true) with check (true);

grant select on public.rooms, public.room_products to anon, authenticated;
grant insert, update, delete on public.rooms, public.room_products to authenticated;
grant select on public.room_categories to anon, authenticated;
grant insert, update, delete on public.room_categories to authenticated;

drop policy if exists "Publik boleh membaca kategori per ruangan" on public.room_categories;
create policy "Publik boleh membaca kategori per ruangan" on public.room_categories
  for select to anon, authenticated using (true);
drop policy if exists "Admin boleh mengelola kategori per ruangan" on public.room_categories;
create policy "Admin boleh mengelola kategori per ruangan" on public.room_categories
  for all to authenticated using (true) with check (true);

insert into public.rooms (name, slug, description, sort_order) values
  ('Ruang Tamu', 'ruang-tamu', 'Pilihan furniture untuk ruang tamu yang nyaman dan berkelas.', 1),
  ('Ruang Makan', 'ruang-makan', 'Temukan furniture untuk momen berkumpul bersama.', 2),
  ('Kamar Tidur', 'kamar-tidur', 'Lengkapi kamar dengan furniture yang nyaman dan fungsional.', 3),
  ('Ruang Kerja', 'ruang-kerja', 'Pilihan furniture untuk ruang kerja yang nyaman.', 4),
  ('Area Outdoor', 'area-outdoor', 'Jelajahi furniture untuk teras dan area luar ruangan.', 5)
on conflict (slug) do nothing;

-- Isi awal diambil dari kategori terkait. Setelah itu, pilihan dan urutannya
-- dapat diedit sepenuhnya dari Dashboard Admin > Ruangan.
with room_categories(room_slug, category_slugs) as (
  values
    ('ruang-tamu', array['sofa','kursi-santai','meja-kopi','meja-samping','meja-konsol','kabinet','kursi-bar']),
    ('ruang-makan', array['meja-makan','kursi-makan','kursi-bar','kabinet','meja-konsol','meja-samping']),
    ('kamar-tidur', array['rangka-tempat-tidur','lemari','meja-samping','kursi-santai','meja-konsol']),
    ('ruang-kerja', array['meja-kerja','kabinet','kursi-santai','meja-samping','meja-konsol']),
    ('area-outdoor', array['furnitur-luar-ruangan'])
), products_to_add as (
  select r.id as room_id, p.id as product_id,
         row_number() over (partition by r.id order by p.id)::integer as sort_order
  from room_categories rc
  join public.rooms r on r.slug = rc.room_slug
  join public.products p on true
  join public.categories c on c.id = p.category_id
  where c.slug = any(rc.category_slugs)
     or (rc.room_slug = 'ruang-tamu' and p.name ilike any (array['%rak buku%', '%rak tv%', '%rak televisi%']))
     or (rc.room_slug = 'kamar-tidur' and p.name ilike '%meja rias%')
     or (rc.room_slug = 'ruang-kerja' and p.name ilike any (array['%rak buku%', '%kursi kerja%', '%kursi kantor%']))
)
insert into public.room_products (room_id, product_id, sort_order)
select p.room_id, p.product_id, p.sort_order
from products_to_add p
on conflict (room_id, product_id) do nothing;

-- Asosiasikan tiap ruangan dengan kategori yang sebelumnya tampil pada katalog.
-- Menjalankan ulang migrasi aman; kategori yang sudah tersimpan tidak diduplikasi.
with room_category_order(room_slug, category_slugs) as (
  values
    ('ruang-tamu', array['sofa','kursi-santai','meja-kopi','meja-samping','meja-konsol','kabinet','kursi-bar']),
    ('ruang-makan', array['meja-makan','kursi-makan','kursi-bar','kabinet','meja-konsol','meja-samping']),
    ('kamar-tidur', array['rangka-tempat-tidur','lemari','meja-samping','kursi-santai','meja-konsol']),
    ('ruang-kerja', array['meja-kerja','lemari','kabinet','kursi-santai','meja-samping','meja-konsol']),
    ('area-outdoor', array['furnitur-luar-ruangan'])
), categories_to_add as (
  select r.id as room_id, c.id as category_id,
         array_position(rc.category_slugs, c.slug)::integer as sort_order
  from room_category_order rc
  join public.rooms r on r.slug = rc.room_slug
  join public.categories c on c.slug = any(rc.category_slugs)
)
insert into public.room_categories (room_id, category_id, sort_order)
select room_id, category_id, sort_order
from categories_to_add
on conflict (room_id, category_id) do nothing;
