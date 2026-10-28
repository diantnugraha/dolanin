# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Satu aplikasi Next.js (App Router) yang berjalan di Node.js, dengan Prisma + PostgreSQL. Halaman publik, CMS `/admin`, dan API ada di aplikasi yang sama. Hosting di satu VPS (Caddy + Node.js + PostgreSQL), video di Bunny Stream, foto di Bunny Storage (API S3-compatible) + Pull Zone. Mobile-first, lalu responsif ke desktop.

## Users

- **Pengunjung:** wisatawan lokal Indonesia yang mencari penginapan murah (hotel dan villa) di kota tujuan. Mayoritas membuka dari smartphone.
- **Admin:** klien pemilik Dolanin. Web ini dibangun untuk mereka. Admin mengelola isi katalog lewat CMS (CRUD konten dan link pemesanan per listing: link affiliate OTA milik mereka sendiri dan link WhatsApp).

## Product Purpose

Dolanin adalah katalog terkurasi yang mengarahkan pengunjung ke link affiliate milik pemilik. Alurnya: landing (hero) → katalog → halaman detail → klik salah satu **link pemesanan** (Agoda, Traveloka, Trip.com, tiket.com, Booking.com, atau WhatsApp ke pemilik). Ukuran sukses: klik ke link pemesanan, dilihat per channel.

## Positioning

Dolanin menampilkan pilihan murah yang sudah diseleksi pemilik (kurasi), plus promo atau harga khusus. Pengunjung tidak perlu menyaring ribuan hasil di OTA besar.

## Operating Context

- Pengunjung menjelajah dari HP, menyaring berdasarkan **kota, harga, dan tipe**, dan mengurutkan berdasarkan **harga**.
- Setiap item di katalog punya halaman detail sebelum keluar ke situs partner.
- Admin mengisi konten (foto/video, data, link pemesanan per channel) lewat CMS.

## Capabilities and Constraints

- Isi katalog hanya akomodasi. Tipe: **Hotel** dan **Villa**. Kategori Penginapan dihapus pemilik pada 28 Oktober 2026; listing Penginapan yang sudah ada menjadi Hotel. Tempat wisata dan transportasi tidak termasuk.
- Filter: kota, harga, tipe. Urutan: harga.
- Klik kartu katalog selalu membuka halaman detail dulu. Dari detail, pengunjung memilih tempat memesan: satu tombol logo per link yang diisi admin, urutan tetap Agoda, Traveloka, Trip.com, tiket.com, Booking.com, WhatsApp (sejak 29 Oktober 2026, menggantikan tombol Pesan dan Chat WhatsApp). Listing tayang wajib punya minimal satu link.
- Media item: foto dan/atau video vertikal 9:16 (konten klien yang sudah ada di IG/TikTok). Kalau item punya video, halaman detail dibuka dengan video setinggi layar (autoplay, muted, loop). Kalau tidak ada video, halaman dibuka dengan galeri foto 4:5. Video di-upload sebagai file lewat CMS, bukan embed IG/TikTok. Ini keputusan sementara yang dianggap disetujui, dan ruang penyimpanan videonya belum dipilih.
- CMS: hanya satu akun admin (dipakai bersama oleh pembuat web dan klien), tanpa role. Admin bisa CRUD listing dan kota, serta mengatur nomor WA default untuk tombol "Tanya via WA" di header dan landing. Ada dashboard berisi klik per channel, total klik, dan kunjungan halaman detail.
- Satu web, satu katalog. Bukan multi-tenant.
- Rating tidak ditampilkan.
- Belum diputuskan: daftar kota awal.

## Brand Commitments

- Nama: **Dolanin**. Wordmark "dolan" + "in" (huruf "in" berwarna aksen). Ikon berupa pin lokasi dengan matahari dan ombak.
- Design system dari pemilik: `~/Downloads/dolanin_brand_design_system.html`. Isinya:
  - Font Poppins.
  - Warna: Jingga dolan #F26B3A (utama), Biru laut #0E8C8C (sekunder), Kuning senja #FFC24B (aksen), Malam #1F2A37 (teks), Pasir #FFF6EC (latar), tint #FFEFE8 / #E3F4F4, WhatsApp #25D366, abu #6B7280.
  - Kartu radius 16px, tombol pill, ikon outline 1.5–2px, spasi kelipatan 4px.
- Gaya bahasa santai, menyapa pembaca dengan "kamu" atau "-mu" ("Yuk, dolan!").
- Batasan dari pemilik: **tanpa gradient warna**, dan tidak boleh terlihat seperti template generik buatan AI.

## Evidence on Hand

- Pemilik sudah punya foto/video, data, dan link affiliate untuk sekitar 50 listing awal. Semuanya akan diketik manual lewat CMS, tanpa impor massal. Materinya belum masuk repo.
- Belum ada testimoni, rating terverifikasi, atau angka statistik. Jangan dikarang.

## Product Principles

1. Jalan menuju pemesanan (link OTA atau WhatsApp) harus selalu terlihat, terutama di HP.
2. Harga murah dan promo adalah alasan utama orang datang. Tampilkan dengan jujur dan jelas.
3. Kurasi, bukan banjir pilihan: lebih sedikit item tapi meyakinkan.
4. HP dulu. Desktop adalah perluasan, bukan versi utama.
