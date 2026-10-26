# Dolanin: dokumen desain

Tanggal: 26 Oktober 2026
Status: disetujui pemilik (26 Oktober 2026)
Pendamping: `PRODUCT.md` (fakta produk), `.impeccable/surfaces/landing.md` (arah visual landing), mockup di `docs/superpowers/specs/2026-10-26-dolanin-mockups/`

Label **[keputusan asisten]** artinya keputusan itu diambil oleh saya (asisten) selama brainstorming dan belum dikonfirmasi eksplisit oleh pemilik. Periksa label ini saat membaca.

---

## 1. Apa ini dan kenapa

Dolanin adalah web katalog akomodasi murah: hotel, penginapan, dan villa. Targetnya wisatawan lokal Indonesia yang kebanyakan membuka web dari HP.

Setiap listing punya halaman detail dengan dua jalan keluar:

- **Pesan**: membuka link affiliate milik klien di situs partner (Traveloka, Tiket.com, dan sejenisnya). Klien mendapat komisi dari sini.
- **Chat WhatsApp**: chat langsung ke nomor klien yang tercantum di web.

Alasan pengunjung datang ke Dolanin, bukan langsung ke OTA besar:

1. Pilihan murah yang sudah dikurasi klien, jadi tidak perlu menyaring ribuan hasil.
2. Promo atau harga khusus.

Ukuran sukses adalah jumlah klik **Pesan** dan **WA**. Dashboard CMS menampilkan keduanya.

Web ini dibangun oleh pengguna (developer) untuk kliennya. "Admin" di dokumen ini berarti satu akun CMS yang dipakai bersama oleh developer dan klien.

## 2. Tujuan, non-goal, anti-goal

**Tujuan**
- Pengunjung dari HP bisa: memilih kota → menyaring dan mengurutkan → membuka detail → menekan Pesan atau WA, tanpa hambatan.
- Halaman detail bisa menampilkan video vertikal 9:16 milik klien (konten yang sudah ada di IG/TikTok) secara "proper", seperti menonton Reels. Listing tanpa video tetap rapi dengan foto.
- Admin bisa mengelola semua isi katalog sendiri dari laptop, dan melihat listing mana yang menghasilkan klik.

**Non-goal (tidak dibangun)**
- Pemesanan atau pembayaran di Dolanin. Semua pemesanan terjadi di situs partner.
- Akun atau login untuk pengunjung, ulasan, rating, testimoni.
- Tempat wisata dan transportasi. Katalog hanya berisi akomodasi.
- Multi-admin, role, atau multi-tenant. Hanya satu web dan satu akun admin.
- Embed player IG/TikTok.
- Pelacakan booking atau komisi. Data itu tetap dilihat di dashboard affiliate masing-masing partner.
- Impor massal (spreadsheet atau folder). Sekitar 50 listing awal diketik manual lewat CMS oleh pemilik/klien, jadi form tambah listing harus nyaman dipakai berulang kali.

**Anti-goal (kalau terjadi, dianggap gagal meskipun "jalan")**
- Tampilan generik ala template AI, atau memakai **gradient warna**. Pemilik melarang keduanya secara eksplisit.
- Tombol Pesan/WA tidak selalu terlihat di HP.
- Mengarang rating, testimoni, statistik, atau klaim ("termurah", "terpercaya", dan sejenisnya).
- Halaman berat yang menghabiskan kuota HP, terutama karena video.

## 3. Batasan

- **Stack (dari pemilik):** Next.js dan Node.js dengan Prisma.
  - **Dikonfirmasi pemilik:** satu aplikasi Next.js (App Router). Halaman publik, CMS di `/admin`, dan API (route handler/server action) berjalan di server Node.js milik Next, dengan Prisma ke PostgreSQL. Tidak ada backend terpisah.
- **Infrastruktur (dikonfirmasi pemilik):**
  - **Hosting:** Vercel Pro ($20/bulan). Hobby tidak boleh karena dipakai untuk usaha komersial.
  - **Database:** Postgres terkelola, paket gratis di awal (misalnya Neon atau Supabase).
  - **Video:** Bunny Stream. Kompres, streaming, dan poster otomatis.
  - **Foto:** AWS S3 + CloudFront paket Free.
  - **Upload:** semua upload media dikirim langsung dari browser admin ke Bunny/S3 (URL bertanda tangan atau upload TUS), tidak lewat function Vercel, karena batas body request Vercel 4,5 MB.
  - **Biaya:** perkiraan total sekitar $21–23/bulan.
- **Mobile-first.** HP adalah versi utama, desktop adalah perluasannya. Layout harus responsif.
- **Bahasa:** Indonesia saja, nada santai dan menyapa dengan "kamu"/"-mu".
- **Brand:** wajib mengikuti design system Dolanin (bagian 8).
- **Satu akun admin**, tanpa role.

## 4. Halaman pengunjung

Mockup HP: `mobile-landing-katalog-detail.html`, `mobile-detail-video.html`. Mockup desktop: `desktop.html`.

### 4.1 Landing (susunan "Kota Dulu", dipilih pemilik)

Idenya: landing berfungsi seperti papan tujuan. Wisatawan lokal biasanya memutuskan *ke mana* dulu, baru *nginep di mana*.

- **Header:** logo, tombol cari (HP: ikon; desktop: kolom "Cari kota atau nama penginapan"). Desktop juga menampilkan tombol "Tanya via WA".
- **Tagline (opsi C, dipilih pemilik):** "Yuk, dolan! Nginepnya biar **hemat**, jalan-jalannya puas."
  - Kata "hemat" diberi stabilo Kuning senja (warna flat).
  - Subline: "Bandingkan hotel, penginapan, dan villa murah per kota, lalu pesan lewat link resmi atau tanya via WhatsApp."
  - Jangan memakai frasa "sudah kami pilihkan".
- **Segmen tipe:** Semua / Hotel / Penginapan / Villa. Segmen ini mengubah angka di papan kota.
- **Papan kota:**
  - HP: 2 kolom. Desktop: 3×2, dengan tile terakhir "N kota lainnya".
  - Tiap tile berisi foto kota rasio 4:5, kode kota kecil di pojok, panel berisi nama kota, "mulai RpXrb", dan "N pilihan". Harga dan jumlah dihitung dari listing yang tayang sesuai segmen tipe.
  - Tap tile membuka katalog kota itu.
  - **[keputusan asisten]** Kota yang tidak punya listing tayang disembunyikan. Urutan kota diatur admin.
- **Promo minggu ini:** carousel horizontal di HP, 4 kolom di desktop. Isinya listing dengan saklar "Promo minggu ini" aktif.
- **Blok WhatsApp:** "Bingung pilih yang mana? Ceritakan tujuan dan budget-mu, nanti kami bantu carikan." dengan tombol Chat WhatsApp ke nomor default.
- **Footer:** logo, "Pemesanan diproses di situs partner resmi. Harga dapat berubah sewaktu-waktu.", dan © tahun.

**Halaman pendukung (semuanya [keputusan asisten]).** Halaman ini muncul dari tautan di mockup tapi belum dijelaskan sebelumnya:
- **Semua kota** (`/kota`): grid semua tile kota. Dituju oleh "Lihat N kota lainnya" (HP menampilkan 4 kota pertama) dan tile "N kota lainnya" di desktop.
- **Semua promo** (`/promo`): halaman katalog berisi semua listing dengan harga normal (berlabel Promo) dari semua kota. Filter dan urutannya sama dengan katalog.
- **Hasil cari** (`/cari?q=`): halaman katalog yang memakai layout yang sama, berisi listing yang nama atau kotanya cocok. Kalau `q` sama persis dengan nama kota, pengunjung langsung dialihkan ke katalog kota itu.

### 4.2 Katalog (per kota)

- URL: `/{kota-slug}`.
- **Header:** foto kota sebagai banner, nama kota, dan jumlah pilihan.
- **Filter:** kota (pilih satu), tipe (bisa lebih dari satu, dengan jumlah per tipe), dan harga per malam (isi min/maks atau pilih cepat < Rp150rb / Rp150–300rb / > Rp300rb).
- **Urutan:** harga termurah (default) atau termahal.
- **HP:** chip filter di bar yang menempel di atas, kartu berbentuk baris (foto kiri). **[keputusan asisten]** Chip dibuka sebagai bottom sheet.
- **Desktop:** filter di sidebar kiri yang menempel, grid 3 kolom, urutan di kanan atas.
- **Kartu:** foto, label tipe, nama, area, harga per malam, harga normal dicoret, dan stempel "Promo" kalau ada harga normal. Tap kartu selalu membuka detail.
- **Banyak hasil:** tombol "Tampilkan lebih banyak". **[keputusan asisten]** 12 kartu per muatan.
- Kolom cari di header mencari nama listing dan nama kota.

### 4.3 Detail listing

- URL: `/{kota-slug}/{listing-slug}`.

**Bagian pembuka (aturan media):**
- **Kalau media pertama adalah video (HP):** video 9:16 setinggi layar, autoplay, muted, loop, dan playsinline.
  - Di atas video: garis progres per media (seperti stories), tombol kembali, suara, layar penuh, dan bagikan, serta label "Video · durasi".
  - Panel info (nama, tipe, area, harga) mengintip dari bawah. Saat di-scroll, panel naik menutupi video.
- **Kalau media pertama adalah foto:** galeri foto 4:5 yang bisa digeser, dengan indikator titik.
- **Layar penuh (tap video/foto):** tampilan ala Reels, bisa digeser antar media, keterangan nama + posisi media, dan bar Pesan/WA tetap ada.
- **Desktop:** mosaik media. Video 9:16 menjadi tile tinggi di kiri, foto di kanan, dan ada tombol "Lihat semua (N)".

**Isi:**
- Label tipe, nama, area/jarak.
- Kotak harga: harga normal dicoret + harga promo + stempel Promo, atau harga saja kalau tidak ada promo.
- **"Kenapa kami pilih ini":** deskripsi dari admin, dengan tanda "Dipilih tim Dolanin". Ini cara menonjolkan kurasi.
- Foto & video (grid).
- Fasilitas (ikon + label).
- Lokasi: alamat dan tautan "Buka di Google Maps".

**Aksi:**
- HP: dock bawah yang selalu menempel, berisi "mulai dari Rp…", tombol WA (ikon), dan tombol **Pesan ↗**.
- Desktop: kartu kanan yang menempel, berisi harga, **Pesan sekarang**, **Tanya via WhatsApp**, dan catatan "Pemesanan diproses di situs partner resmi. Harga bisa berubah sewaktu-waktu."
- **Pesan** membuka link affiliate di tab baru.
- **WA** membuka `wa.me/{nomor}`. **[keputusan asisten]** Pesan WA sudah terisi otomatis, misalnya "Halo, saya tertarik dengan {nama listing} di Dolanin: {url}".
- **Bagikan** memakai Web Share API, dengan cadangan salin tautan.

### 4.4 Batasan video untuk pengunjung

Pengguna banyak memakai kuota HP, jadi:
- Video dikompresi dan dibatasi ukurannya.
- Poster ditampilkan sebelum video dimuat.
- Video di luar layar tidak dimuat.

Detail teknisnya (bitrate, format, CDN) diserahkan ke builder.

## 5. CMS (`/admin`)

Mockup: `cms-listing-form.html`, `cms-dashboard.html`. Dipakai dari laptop. **[keputusan asisten]** CMS tidak dirancang khusus untuk HP, tapi tetap tidak boleh rusak di layar kecil.

### 5.1 Login
Satu akun admin. Kredensial disimpan dengan aman (password di-hash, sesi aman). Tidak ada pendaftaran, role, atau multi-user. Cara reset password diserahkan ke builder, cukup yang sederhana.

### 5.2 Navigasi
Sidebar: Dashboard, Listing, Kota, Pengaturan, Lihat web, dan Keluar.

### 5.3 Listing: daftar
- Tabel berisi foto (ikon ▶ kalau ada video), nama, area, waktu terakhir diubah, kota, tipe, harga (dicoret + promo), status Tayang/Draf, dan aksi (ubah, buka di web, menu lain berisi hapus).
- Cari berdasarkan nama. Filter kota, tipe, dan status.
- Tidak ada kolom statistik di sini, karena statistik ada di Dashboard (permintaan pemilik).

### 5.4 Listing: tambah/ubah (satu halaman)
Field yang disebut pemilik: **nama, kota, tipe, harga, foto/video, deskripsi, fasilitas, link affiliate, nomor WA**. Tambahan berikut juga sudah disetujui pemilik:

| Kelompok | Field | Aturan |
|---|---|---|
| Info dasar | Nama | wajib |
| | Kota | wajib, dipilih dari data Kota |
| | Tipe | wajib: Hotel / Penginapan / Villa |
| | Area / alamat | wajib (tampil di kartu dan bagian Lokasi) |
| | Link Google Maps | opsional |
| Harga | Harga per malam | wajib, rupiah |
| | Harga normal | opsional. Kalau diisi dan lebih tinggi dari harga, otomatis berlabel **Promo** |
| Media | Foto & video | minimal 1 media. Upload dengan seret-lepas, urutan bisa diubah dengan diseret, dan media pertama jadi pembuka detail. **[keputusan asisten]** Video vertikal 9:16, maksimal 60 detik. |
| Deskripsi | "Kenapa kami pilih ini" | wajib, maksimal 300 karakter, ada penghitung karakter |
| Fasilitas | Daftar pilihan + "Lainnya" | preset: WiFi, AC, Sarapan, Parkir motor, Parkir mobil, Kolam renang, Dapur, Air panas. "Lainnya" untuk teks bebas |
| Tombol | Link affiliate | wajib, URL valid, dibuka di tab baru |
| | Nomor WhatsApp | opsional. Kalau kosong, memakai nomor default dari Pengaturan |
| Status | Tayangkan (saklar) | mati = draf, tidak tampil di web |
| | Masuk "Promo minggu ini" (saklar) | tampil di baris promo landing |

- Di kanan ada **pratinjau kartu** yang ikut berubah saat admin mengetik.
- Ada tombol Simpan dan Simpan draf.
- Slug otomatis dibuat dari nama. **[keputusan asisten]**

### 5.5 Kota
CRUD kota dengan field: nama, slug, kode singkat (contoh: YK, DPS, BD, ML), foto (untuk tile dan banner), dan urutan tampil. **[keputusan asisten]** Kota yang masih punya listing tidak bisa dihapus.

### 5.6 Pengaturan
Nomor WhatsApp default, dipakai di blok WA landing, tombol WA di header desktop, dan listing yang nomornya kosong. Ganti password juga ada di sini.

### 5.7 Dashboard
Permintaan pemilik: statistik klik dipindah ke dashboard.

- **Filter dalam satu baris, berlaku untuk semua panel:** rentang 7 / 30 / 90 hari, kota, dan tipe.
- **Angka utama:**
  - **Klik tombol Pesan** (angka terbesar, karena menghasilkan komisi).
  - Chat WhatsApp, kunjungan halaman detail, dan rasio klik = (Pesan + WA) ÷ kunjungan detail.
  - Tiap angka disertai perubahan (%) dibanding periode sebelumnya yang sama panjang.
- **Klik per hari:** grafik garis Pesan dan WA dalam satu sumbu, dengan tooltip crosshair dan tampilan tabel.
- **Klik Pesan per kota:** bar horizontal. Kota di luar 5 teratas digabung jadi "Kota lainnya".
- **Listing paling banyak diklik:** kunjungan, klik Pesan (dengan bar kecil), WA, dan rasio.
- **Belum ada klik:** listing tayang dengan 0 klik di periode itu, dengan tombol Ubah.
- Catatan tetap: "Klik bukan pemesanan. Booking dan komisi dilihat di dashboard affiliate masing-masing."
- Warna grafik sudah divalidasi untuk buta warna dan kontras: Pesan = `#F26B3A`, WA = `#00918F` (biru laut yang sedikit lebih jenuh), "lainnya" = abu `#C9C2B8`. Hijau dicadangkan untuk indikator naik/bagus.

## 6. Pencatatan klik dan kunjungan

Yang dicatat per listing:
- **kunjungan halaman detail**
- **klik Pesan**
- **klik WA**

Masing-masing dengan waktu, kota, dan tipe, supaya filter dashboard bisa bekerja.

- **[keputusan asisten]** Tombol Pesan dan WA mengarah ke rute pengalihan internal, misalnya `/go/{id}/pesan` dan `/go/{id}/wa`. Rute ini mencatat klik lalu meneruskan (302) ke link affiliate atau `wa.me`. Dengan cara ini klik tetap tercatat walaupun JavaScript gagal. Link affiliate tetap `rel="noopener"` dan dibuka di tab baru.
- Bot dan crawler sebaiknya tidak dihitung. Tingkat ketelitiannya diserahkan ke builder.
- Tidak ada data pribadi pengunjung yang perlu disimpan.

## 7. Model data (konseptual)

Nama tabel dan kolom akhir ditentukan builder.

- **City:** nama, slug, kode, foto, urutan.
- **Listing:** nama, slug, kota, tipe, area/alamat, link maps, harga, harga normal, deskripsi, fasilitas (preset + lainnya), link affiliate, nomor WA (opsional), tayang (bool), promo minggu ini (bool), waktu dibuat/diubah.
- **Media:** milik Listing, jenis (foto/video), URL file, poster (untuk video), durasi, urutan.
- **Settings:** nomor WA default.
- **Admin:** satu baris kredensial.
- **Event:** listing, jenis (view / pesan / wa), waktu.

Harga "mulai Rp…" di papan kota dan jumlah pilihan dihitung dari listing yang tayang.

## 8. Design system (wajib)

Sumber: `docs/superpowers/specs/2026-10-26-dolanin-mockups/brand-design-system.html`, salinan dari file milik pemilik.

- **Font:** Poppins. Display 32/700 (HP) atau 56/700 (desktop), heading 22/600, subheading 16/500, body 14/400.
- **Warna:**
  - Jingga dolan `#F26B3A`: aksi utama dan harga.
  - Biru laut `#0E8C8C`: sekunder, tanda kota/arah.
  - Kuning senja `#FFC24B`: stempel promo dan stabilo.
  - Malam `#1F2A37`: teks.
  - Pasir `#FFF6EC`: latar.
  - Tint `#FFEFE8` / `#E3F4F4`, WhatsApp `#25D366`, abu `#6B7280`.
- **Bentuk:** kartu radius 16px, tombol pill, ikon outline 1.5–2px (mockup memakai Tabler Icons), spasi kelipatan 4px.
- **Dilarang:** gradient, glass/blur dekoratif, emoji sebagai ikon, dan "eyebrow" kecil di atas judul. Teks di atas foto selalu memakai panel warna solid, bukan scrim gradient.
- Tema terang saja. **[keputusan asisten]**
- **Aksesibilitas yang sudah diterapkan di mockup:**
  - Teks kecil minimal 11px.
  - Harga jingga minimal 20px bold (supaya lolos kontras teks besar).
  - Teks sekunder di atas Pasir memakai `#575E6B`, bukan `#6B7280` (yang hanya 4,45:1).
  - Ada fokus keyboard.
  - Detail lengkap ada di mockup.
- **Tombol jingga (keputusan pemilik):** teks dan ikon di atas `#F26B3A` memakai Malam `#1F2A37`, bukan putih (putih hanya 3:1, Malam sekitar 4,8:1). Warna jingga brand tetap.

## 9. Mockup yang disetujui

Semua di `docs/superpowers/specs/2026-10-26-dolanin-mockups/`. Nama, harga, angka, dan foto di dalamnya adalah **contoh**. Foto berasal dari Wikimedia Commons (CC BY/BY-SA), dan klip video dibuat dari foto, hanya untuk mockup.

| File | Isi |
|---|---|
| `mobile-landing-katalog-detail.html` | HP: landing, katalog, detail foto |
| `mobile-detail-video.html` | HP: detail dengan video (pembuka, setelah scroll, layar penuh, tanpa video) |
| `desktop.html` | Desktop 1280: landing, katalog, detail dengan video |
| `cms-listing-form.html` | CMS: daftar listing dan form tambah/ubah |
| `cms-dashboard.html` | CMS: dashboard |

## 10. Belum diputuskan

- **Pilihan pemilik:**
  - Daftar kota awal.
- **Diserahkan ke builder:**
  - Penyedia Postgres.
  - Detail integrasi Bunny Stream (player, preset kualitas) dan S3/CloudFront.
  - Mekanisme auth dan reset password.
  - Optimasi gambar.
  - SEO dan meta/OG untuk halaman detail (tombol bagikan memerlukannya).
  - Retensi data event.
  - Struktur folder dan komponen.
