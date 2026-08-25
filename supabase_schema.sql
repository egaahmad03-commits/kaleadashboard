-- =========================================================
-- Kalea Furniture — Skema Database Supabase
-- Jalankan seluruh isi file ini di:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- =========================================================

-- 1) TABEL KATEGORI
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon_svg text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) TABEL PRODUK
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  category_id uuid not null references categories(id) on delete restrict,
  price bigint not null,
  description text,
  material text,
  color text,
  dimensions text,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Catatan: foto produk TETAP file statis di asset/images/products/<slug>/1.jpg..6.jpg
-- (tidak dipindah ke Supabase Storage), path-nya dibangun otomatis dari kolom slug,
-- sama seperti sekarang. Tidak perlu tabel gambar terpisah.

-- =========================================================
-- 3) ROW LEVEL SECURITY (RLS)
-- Publik (anon key): HANYA boleh membaca (SELECT).
-- Admin (login lewat Supabase Auth): boleh insert/update/delete.
-- =========================================================

alter table categories enable row level security;
alter table products enable row level security;

-- --- Kebijakan baca publik ---
create policy "Publik boleh membaca kategori"
  on categories for select
  to anon, authenticated
  using (true);

create policy "Publik boleh membaca produk"
  on products for select
  to anon, authenticated
  using (true);

-- --- Kebijakan tulis: HANYA user yang sudah login (authenticated) ---
create policy "Admin boleh tambah kategori"
  on categories for insert
  to authenticated
  with check (true);

create policy "Admin boleh ubah kategori"
  on categories for update
  to authenticated
  using (true) with check (true);

create policy "Admin boleh hapus kategori"
  on categories for delete
  to authenticated
  using (true);

create policy "Admin boleh tambah produk"
  on products for insert
  to authenticated
  with check (true);

create policy "Admin boleh ubah produk"
  on products for update
  to authenticated
  using (true) with check (true);

create policy "Admin boleh hapus produk"
  on products for delete
  to authenticated
  using (true);

-- =========================================================
-- 4) DATA KATEGORI (13 kategori yang sudah ada di situs)
-- =========================================================
insert into categories (name, slug, sort_order) values
  ('Kursi Makan', 'kursi-makan', 1),
  ('Kursi Bar', 'kursi-bar', 2),
  ('Kursi Santai', 'kursi-santai', 3),
  ('Sofa', 'sofa', 4),
  ('Meja Kopi', 'meja-kopi', 5),
  ('Meja Samping', 'meja-samping', 6),
  ('Meja Makan', 'meja-makan', 7),
  ('Meja Kerja', 'meja-kerja', 8),
  ('Meja Konsol', 'meja-konsol', 9),
  ('Kabinet', 'kabinet', 10),
  ('Lemari', 'lemari', 11),
  ('Rangka Tempat Tidur', 'rangka-tempat-tidur', 12),
  ('Furnitur Luar Ruangan', 'furnitur-luar-ruangan', 13)
on conflict (slug) do nothing;

-- 4b) Ikon SVG asli untuk 13 kategori lama (supaya tampilan katalog
-- tetap sama seperti sebelumnya). Kategori baru yang ditambah lewat
-- Panel Admin akan otomatis pakai ikon generik kalau kolom ini kosong.
update categories set icon_svg = '<path d="M6 3h12v9H6z"></path><path d="M6 12v9"></path><path d="M18 12v9"></path><path d="M6 17h12"></path>' where slug = 'kursi-makan';
update categories set icon_svg = '<path d="M8 3h8v6H8z"></path><path d="M9 9l-1 12"></path><path d="M15 9l1 12"></path><path d="M7 21h10"></path>' where slug = 'kursi-bar';
update categories set icon_svg = '<path d="M4 19V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10"></path><path d="M4 14h8"></path><path d="M12 11h6a2 2 0 0 1 2 2v6"></path><path d="M2 19h20"></path>' where slug = 'kursi-santai';
update categories set icon_svg = '<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3z"></path><path d="M3 14v5"></path><path d="M21 14v5"></path><path d="M3 19h18"></path><path d="M5 9V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2"></path>' where slug = 'sofa';
update categories set icon_svg = '<ellipse cx="12" cy="7" rx="9" ry="3"></ellipse><path d="M6 9v6"></path><path d="M18 9v6"></path><path d="M4 15h16"></path>' where slug = 'meja-kopi';
update categories set icon_svg = '<rect x="6" y="4" width="12" height="4" rx="1"></rect><path d="M8 8v12"></path><path d="M16 8v12"></path>' where slug = 'meja-samping';
update categories set icon_svg = '<rect x="3" y="8" width="18" height="3" rx="1"></rect><path d="M5 11v9"></path><path d="M19 11v9"></path>' where slug = 'meja-makan';
update categories set icon_svg = '<rect x="3" y="4" width="18" height="3" rx="1"></rect><path d="M5 7v13"></path><path d="M19 7v13"></path><path d="M5 16h6"></path>' where slug = 'meja-kerja';
update categories set icon_svg = '<rect x="4" y="5" width="16" height="3" rx="1"></rect><path d="M6 8v11"></path><path d="M18 8v11"></path><path d="M4 19h16"></path>' where slug = 'meja-konsol';
update categories set icon_svg = '<rect x="4" y="3" width="16" height="18" rx="1"></rect><path d="M4 12h16"></path><path d="M9 7v3"></path><path d="M9 16v3"></path>' where slug = 'kabinet';
update categories set icon_svg = '<rect x="4" y="2" width="16" height="20" rx="1"></rect><path d="M12 2v20"></path><path d="M9 12v.01"></path><path d="M15 12v.01"></path>' where slug = 'lemari';
update categories set icon_svg = '<path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"></path><path d="M2 18v3"></path><path d="M22 18v3"></path><path d="M2 12V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"></path><path d="M2 18h20"></path>' where slug = 'rangka-tempat-tidur';
update categories set icon_svg = '<path d="M12 2v6"></path><path d="M5 10h14l-1.5 4h-11z"></path><path d="M9 14v7"></path><path d="M15 14v7"></path><path d="M6 21h12"></path>' where slug = 'furnitur-luar-ruangan';

-- =========================================================
-- 5) DATA PRODUK (migrasi dari asset/js/products.js)
-- category_id diambil otomatis lewat subquery ke slug kategori.
-- =========================================================
insert into products (name, category_id, price, description, material, color, dimensions, slug) values
('Kursi Makan Fyn', (select id from categories where slug='kursi-makan'), 1200000, 'Fyn menghadirkan kualitas dan gaya khas Italia pada kursi wishbone bergaya mid-century modern yang ikonik. Dibalut dengan sentuhan akhir kayu walnut, kursi makan kayu ini merayakan siluet abadi melalui kaki-kaki yang meruncing, palang penyangga yang halus, sandaran melengkung beraksen bilah, serta dudukan yang dipahat rapi. Dirancang untuk kenyamanan di meja makan, Fyn mempercantik dekorasi ruang makan Anda dengan keanggunan yang bersahaja.', 'Kayu Jati Solid', 'Walnut Doff', '52 cm x 53 cm x 76,5 cm', 'kursi-makan-via'),
('Kursi Makan Via', (select id from categories where slug='kursi-makan'), 1800000, 'Terinspirasi oleh desain vintage Italia, kursi skulptural Via memanjakan ruang makan Anda dengan tampilan menawan layaknya di galeri desain serta kenyamanan yang melimpah. Kayu walnut dari sumber berkelanjutan membentuk rangkanya dengan lekukan organik dan garis-garis mengalir yang membentuk dudukan silang serta kaki-kaki belakang yang memanjang. Bantal sandaran oval yang melengkung dan dudukan empuk memikat dengan balutan kain beludru (velvet) berwarna toffee brown.', 'Kayu Jati Solid', 'Walnut Doff', '46 cm x 57,5 cm x 75 cm', 'kursi-makan-via-2'),
('Kursi Makan Paolo', (select id from categories where slug='kursi-makan'), 1200000, 'Kursi makan Paolo menghadirkan lengkungan paddle-back klasik ala mid-century modern.  Dudukan berkonturnya nyaman untuk santap santai. Warna ebonized hitam memberi kesan dramatis pada siluetnya yang santai, menjadikannya pasangan ideal untuk meja makan modern Anda.', 'Kayu Jati Solid', 'Hitam Doff', '47 cm x 54 cm x 76 cm', 'kursi-makan-paolo'),
('Kursi Makan Athene', (select id from categories where slug='kursi-makan'), 1800000, 'Dinamai dari ritual penting makan bersama, kursi Ceremonie mengajak Anda bersantai di meja makan dengan kenyamanan dan tampilan menawan. Kursi ini menginterpretasikan ulang gaya wishbone modern tanpa lengan lewat garis vertikal dan struktur sandaran ganda yang memikat. Rangka oak ber-finishing hazelnut brown dipadukan dengan dudukan serta sandaran U empuk berbalut kain bouclé tekstur warna oat.', 'Kayu Jati Solid', 'Natural', '62 cm x 53 cm x 72,5 cm', 'kursi-makan-libby'),
('Kursi Makan Libby', (select id from categories where slug='kursi-makan'), 1600000, 'Gaya modern berpadu retro pada desain ramping kursi makan Odelle. Dilengkapi kaki meruncing dan sandaran anyaman rotan, kursi ini memberi tampilan menawan lewat rangka nettlewood bernuansa light-toasted brown atau brushed ebony. Dibalut dudukan kain campuran linen netral berkualitas tinggi, kursi ini memadukan kenyamanan dan kesan elegan.', 'Kayu Jati Solid', 'Hitam Doff', '50 cm x 63 cm x 91 cm', 'kursi-makan-libby-2'),
('Kursi Makan Athena', (select id from categories where slug='kursi-makan'), 1600000, 'Dinamai dari ritual penting makan bersama, kursi Ceremonie mengajak Anda bersantai di meja makan dengan kenyamanan dan tampilan menawan. Kursi ini menginterpretasikan ulang gaya wishbone modern tanpa lengan lewat garis vertikal dan struktur sandaran ganda yang memikat. Rangka oak ber-finishing hazelnut brown dipadukan dengan dudukan serta sandaran U empuk berbalut kain bouclé tekstur warna natural.', 'Kayu Jati Solid', 'Natural', '49 cm x 53 cm x 78 cm', 'kursi-makan-athena'),
('Kursi Makan Camille', (select id from categories where slug='kursi-makan'), 1600000, 'Mengusung apresiasi mendalam atas kriya dan material pilihan, kursi CAMILLE menghadirkan keanggunan tenang di setiap ruangan. Terbuat dari kayu jati solid, rangkanya yang ringan memancarkan kesederhanaan dan kekuatan alami. Dengan sandaran melengkung lembut bernuansa netral serta garis desain yang mengalir, CAMILLE menawarkan kenyamanan nan elegan untuk ruang makan maupun sudut hunian Anda.', 'Kayu Jati Solid', 'natural Bleach', '58 cm x 56 cm x 80 cm', 'kursi-makan-camille'),
('Kursi Makan Camill', (select id from categories where slug='kursi-makan'), 1600000, 'Berakar dari apresiasi mendalam terhadap keahlian kriya dan material alami, kursi lengan CAMILL menghadirkan keanggunan tenang di setiap sudut ruangan. Terbuat dari kayu jati solid, rangkanya yang ringan memancarkan serat halus dan kehangatan alami. Dilengkapi sandaran melengkung lembut dan dudukan empuk bernuansa netral, kursi ini menawarkan kenyamanan nan elegan tanpa kesan berlebihan.', 'Kayu Jati Solid', 'Hitam Doff', '58 cm x 56 cm x 80 cm', 'kursi-makan-camill'),
('Kursi Makan Nemo', (select id from categories where slug='kursi-makan'), 1800000, 'Sebuah perayaan atas kriya dan kejelasan desain, kursi lengan NEMO menyaring keindahan dalam bentuk termurninya. Dengan siluet anggun dari kayu jati solid, NEMO menawarkan pesona skulptural yang abadi sekaligus kontemporer. Dudukan berbalut kain memberikan kelembutan ekstra pada rangka arsitekturalnya, menghadirkan kenyamanan sempurna tanpa mengurangi kesan minimalis. Pasangan ideal untuk meja makan maupun sudut ruangan Anda.', 'Kayu Jati Solid', 'Walnut Doff', '63 cm x 55 cm x 81 cm', 'kursi-makan-nemo'),
('Kursi Makan Sissi', (select id from categories where slug='kursi-makan'), 1600000, 'Terinspirasi oleh kursi kantor ikonik era 1950-an karya Pierre Jeanneret, seri SISSI memadukan desain modern dengan kriya tradisional. Mengusung estetika kontemporer yang elegan dan abadi, bentuk SISSI yang khas mampu mempercantik setiap ruangan lewat kekuatan minimalis serta desainnya yang ekspresif. Hadir dengan dudukan empuk yang nyaman, kursi ini siap memberikan sentuhan gaya berkelas pada hunian Anda.', 'Kayu Jati Solid', 'Natural', '58 cm x 52 cm x 83 cm', 'kursi-makan-sissi'),
('Kursi Makan Kantilever', (select id from categories where slug='kursi-makan'), 2800000, 'kursi kantilever yang memadukan kesederhanaan dengan keanggunan abadi. Dilengkapi rangka logam berlapis krom beraksen Bauhaus yang halus, kursi ini menghadirkan sentuhan modern pada ruang makan Anda. Dibalut pilihan kulit atau kain yang elegan, pilihan sempurna bagi para pecinta desain.', 'Stainless', 'Silver', '53 cm x 56 cm x 80 cm', 'kursi-makan-kantilever'),
('Kursi Makan Alani', (select id from categories where slug='kursi-makan'), 1800000, 'Nikmati kenyamanan kursi lengan ALANI yang memadukan kehangatan ekstra dan desain modern secara sempurna. Dilengkapi dudukan empuk serta sandaran tangan melengkung, ALANI menawarkan pengalaman duduk yang sangat menyenangkan. Kaki logamnya yang ramping memberi kesan ringan nan elegan, sementara balutan kain bernuansa netral menjadikannya pas diletakkan di ruang makan, ruang kerja, maupun ruang keluarga.', 'Besi', 'Hitam Doff', '58 cm x 58 cm x 78 cm', 'kursi-makan-alani'),
('Kursi Makan Felici', (select id from categories where slug='kursi-makan'), 1600000, 'Kursi FELICIA menghadirkan kenyamanan yang santai ke meja makan Anda. Busa tebal pada dudukan dan sandarannya mengundang Anda untuk bersantai lebih lama. Kaki-kakinya yang ramping serta siluet modern memberikan tampilan ringan dan elegan yang mudah dipadukan. FELICIA siap mempercantik momen santap malam hingga percakapan hangat dengan keanggunan yang bersahaja.', 'Besi', 'Custom', '51 cm x 54 cm x 84 cm', 'kursi-makan-felici'),
('Kursi Makan Adrien', (select id from categories where slug='kursi-makan'), 1600000, 'Kursi lengan ADRIEN memadukan pengaruh mid-century dengan minimalis kontemporer, menciptakan tampilan abadi sekaligus modern. Siluetnya yang melengkung nyaman dibalut kain bouclé bertekstur lembut, memberikan sentuhan kemewahan nan tenang pada garis geometrisnya yang tegas. Sempurna untuk mempercantik sudut ruang makan atau hunian Anda.', 'Kayu Jati Solid', 'Hitam Doff', '56 cm x 51 cm x 82 cm', 'kursi-makan-adrien'),
('Kursi Makan Celia', (select id from categories where slug='kursi-makan'), 1800000, 'Kursi makan CELIA menghadirkan perpaduan sempurna antara desain mid-century dan kenyamanan ekstra. Dilengkapi sandaran berbentuk setengah lingkaran serta lapisan busa di sekelilingnya untuk bersandar santai. Kaki-kakinya yang sedikit mekar memberi sentuhan gaya khas era 50-an dan 60-an yang elegan pada ruang makan Anda.', 'Kayu Jati Solid', 'Hitam Doff', '61 cm x 59 cm x 80 cm', 'kursi-makan-celia'),
('Kursi Bar Arno', (select id from categories where slug='kursi-bar'), 1500000, 'Pesona Arno terletak pada detail desainnya yang halus. Melengkung sempurna, sandaran bilahnya menopang punggung dengan nyaman, sementara dudukan yang dipahat pas untuk meja counter atau meja makan tinggi. Dilengkapi fitur putar 180° dengan mekanisme otomatis yang mengembalikan posisi dudukan agar tampilan tetap rapi.', 'Kayu Jati Solid', 'Natural', '53 cm x 47 cm x 103 cm', 'kursi-bar-arno'),
('Kursi Bar Vegan', (select id from categories where slug='kursi-bar'), 1600000, 'Dibuat dengan dudukan kulit warna tan yang mewah, kursi bar ini memadukan pesona rustic dan keanggunan modern. Konstruksi kayu solidnya menjamin ketahanan jangka panjang, sementara dudukan kulitnya yang empuk memberikan kenyamanan ekstra. Pilihan tepat untuk membawa kehangatan dan gaya abadi ke Dapur Anda.', 'Kayu Jati Solid', 'Natural', '52 cm x 48 cm x 98 cm', 'kursi-makan-vegan'),
('Kursi Bar Tempo', (select id from categories where slug='kursi-bar'), 1600000, 'Kursi bar Tempo memadukan desain modern yang ramping dengan kenyamanan ergonomis. Dilengkapi dasar yang kokoh dan dudukan berlekuk nan elegan, kursi ini menjadi pilihan ideal untuk hunian maupun area komersial yang menginginkan sentuhan gaya kontemporer serta fungsionalitas yang praktis.', 'Kayu Jati Solid', 'Natural', '49 cm x 53 cm x 94,5 cm', 'kursi-makan-tempo'),
('Kursi Bar Vermore', (select id from categories where slug='kursi-bar'), 1400000, 'Kursi bar Vermore memadukan desain bergaya dengan kenyamanan optimal. Menampilkan garis-garis tegas dari kayu jati, serta dudukan elegan berbalut tekstil kulit yang tahan lama, kursi ini tampak modern sekaligus abadi. Sangat cocok untuk kitchen island atau meja bar Anda.', 'Kayu Jati Solid', 'Walnut Doff', '40 cm x 40 cm x 68 cm', 'kursi-bar-vermore'),
('Kursi Bar Sissi', (select id from categories where slug='kursi-bar'), 1400000, 'Terinspirasi oleh kursi kantor ikonik era 1950-an karya Pierre Jeanneret, seri SISSI memadukan desain modern dengan kriya tradisional. Mengusung estetika kontemporer yang elegan dan abadi khas Westwing Collection, bentuk SISSI yang khas mampu mempercantik ruangan Anda lewat kekuatan minimalis serta desainnya yang penuh karakter.', 'Kayu Jati Solid', 'Natural', '46 cm x 45 cm x 65 cm', 'kursi-bar-sissi'),
('Tempat Tidur Sato', (select id from categories where slug='rangka-tempat-tidur'), 8000000, 'Tempat tidur kayu bergaya modern minimalis ini menghadirkan perpaduan sempurna antara fungsionalitas dan estetika yang elegan. Dibuat dari material kayu berkualitas dengan sentuhan finishing cokelat medium yang hangat, ranjang ini memancarkan nuansa alami yang menenangkan ke dalam kamar tidur Anda.', 'Kayu Jati Solid', 'Walnut Doff', '160 x 200 cm', 'tempat-tidur-sato'),
('Tempat Tidur Nanto', (select id from categories where slug='rangka-tempat-tidur'), 12500000, 'Hadirkan tempat tidur Nanto sebagai solusi sempurna untuk kamar tidur yang modern dan rapi. Headboard kayu berukuran ekstra luas tidak hanya memberikan kesan estetis yang menawan, tetapi juga dilengkapi dengan meja samping (bedside table) terintegrasi dan fungsi penyimpanan yang praktis.', 'Kayu Jati Solid', 'Walnut Doff', '180 x 200 cm', 'tempat-tidur-nanto'),
('Tempat Tidur Lennon', (select id from categories where slug='rangka-tempat-tidur'), 14000000, 'Temukan kenyamanan maksimal dengan tempat tidur LENNON, bagian dari seri terlaris yang menghadirkan wujud sejati dari rasa hangat dan bersahaja. Dilengkapi dengan rangka berbusa tebal yang luas, tempat tidur ini sangat praktis untuk menaruh ponsel maupun remote control. Sandaran kepala (headboard) yang empuk juga memberikan kenyamanan ekstra saat Anda membaca, menonton TV, atau menikmati sarapan di atas tempat tidur.', 'Kayu Jati Solid', 'Custom', '180 x 200 cm', 'tempat-tidur-lennon'),
('Tempat Tidur Cloud', (select id from categories where slug='rangka-tempat-tidur'), 13000000, 'Rasakan sensasi tidur yang nyenyak layaknya di atas awan sekaligus menghemat ruang dengan tempat tidur upholstered CLOUD. Sandaran kepala (headboard) berbusa empuk sangat nyaman untuk bersandar saat membaca, menonton TV, atau menikmati sarapan di atas tempat tidur.', 'Kayu Jati Solid', 'Custom', '180 x 200 cm', 'tempat-tidur-cloud'),
('Tempat Tidur Sofia', (select id from categories where slug='rangka-tempat-tidur'), 13000000, 'Hadirkan kenyamanan maksimal di kamar tidur Anda dengan tempat tidur SOFIA. Menampilkan desain lembut nan empuk layaknya awan, tempat tidur ini mengusung garis khas dari koleksi sofa SOFIA untuk menciptakan suasana ruangan yang harmonis dan penuh gaya. Rangka berbusa (upholstered) memberikan kenyamanan ekstra, sementara sandaran kepala (headboard) berlekuk anggun memberikan sentuhan unik yang menawan. Sebuah statement piece bagi Anda yang mengutamakan kenyamanan dan estetika.', 'Kayu Jati Solid', 'Custom', '180 x 200 cm', 'tempat-tidur-sofia'),
('Kursi Makan Nik', (select id from categories where slug='kursi-makan'), 1600000, 'Kursi makan NIK menghadirkan perpaduan sempurna antara desain dinamis dan keanggunan yang abadi. Dilengkapi sandaran melayang yang unik serta bantalan empuk untuk kenyamanan ekstra. Struktur kayunya yang tegas dan dipadukan dengan meja makan NIK memberi sentuhan elegan pada ruang makan, kantor, maupun ruang keluarga Anda.', 'Kayu Jati Solid', 'Natural', '58 cm x 54 cm x 80 cm', 'kursi-makan-nik'),
('Kursi Makan Gali', (select id from categories where slug='kursi-makan'), 1600000, 'Kursi makan GALI menghadirkan perpaduan sempurna antara keberlanjutan dan gaya yang tak lekang oleh waktu. Dibuat dari bahan ramah lingkungan dengan pengerjaan teliti, kursi ini menawarkan kenyamanan ekstra dan nilai estetika tinggi. Desainnya yang elegan menjadikannya daya tarik utama yang cocok untuk ruang makan, kantor, maupun ruang keluarga Anda.', 'Kayu Jati Solid', 'Natural', '56 cm x 55 cm x 81 cm', 'kursi-makan-gali'),
('Kursi Makan Maia', (select id from categories where slug='kursi-makan'), 1800000, 'Kursi makan MAIA menghadirkan perpaduan sempurna antara keanggunan gaya barok dan sentuhan modern yang memikat. Dilengkapi sandaran khas medaillon serta lapisan kain bouclé yang lembut untuk kenyamanan ekstra. Rangka kayunya yang edel memberi sentuhan gaya yang elegan dan menjadi daya tarik utama pada ruang makan, ruang keluarga, maupun kamar tidur Anda.', 'Kayu Jati Solid', 'Walnut Doff', '59 cm x 57 cm x 88 cm', 'kursi-makan-maia'),
('Kursi Makan Katya', (select id from categories where slug='kursi-makan'), 1600000, 'Kursi makan KATYA menghadirkan perpaduan sempurna antara bentuk yang anggun dan karakter yang memikat. Dilengkapi konstruksi tiga kaki yang futuristik serta sandaran terbuka yang memberikan kesan ringan. Material kayu jati solid dan proporsinya yang kompak memberi sentuhan gaya yang elegan dan sangat ideal untuk ruang berukuran minimalis maupun tata letak yang dinamis.', 'Kayu Jati Solid', 'Natural', '49 cm x 51 cm x 82 cm', 'kursi-makan-katya'),
('Kursi Makan Bodrum', (select id from categories where slug='kursi-makan'), 1600000, 'Kursi makan Bodrum menghadirkan perpaduan sempurna antara keanggunan klasik dan sentuhan desain alami yang modern. Dilengkapi aksen kayu terekspos pada sandaran untuk memberikan kesan mewah, serta rangka kayu jati solid yang kokoh dan tahan lama. Desainnya yang elegan dan fungsional membuatnya menjadi daya tarik utama yang sempurna untuk santap sehari-hari maupun acara spesial Anda.', 'Kayu Jati Solid', 'Walnut Doff', '53 cm x 56 cm x 84 cm', 'kursi-makan-bodrum')
on conflict (slug) do nothing;

-- =========================================================
-- SELESAI. Setelah dijalankan, cek hasilnya:
--   select count(*) from categories;   -- harus 13 (atau lebih kalau kamu tambah)
--   select count(*) from products;     -- harus 30
-- =========================================================
