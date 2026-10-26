# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Satu aplikasi Next.js (App Router) yang berjalan di Node.js, dengan Prisma + PostgreSQL. Halaman publik, CMS `/admin`, dan API ada di aplikasi yang sama. Hosting di Vercel Pro, video di Bunny Stream, foto di S3 + CloudFront. Mobile-first, lalu responsif ke desktop.

## Users

- **Pengunjung:** wisatawan lokal Indonesia yang mencari penginapan murah (hotel, penginapan, villa) di kota tujuan. Mayoritas membuka dari smartphone.
- **Admin:** klien pemilik Dolanin. Web ini dibangun untuk mereka. Admin mengelola isi katalog lewat CMS (CRUD konten, link affiliate milik mereka sendiri, dan nomor WhatsApp yang tampil di web).

## Product Purpose

Dolanin adalah katalog terkurasi yang mengarahkan pengunjung ke link affiliate milik pemilik. Alurnya: landing (hero) → katalog → halaman detail → klik **Pesan** (link affiliate) atau **Chat WhatsApp** ke pemilik. Ukuran sukses: klik ke link affiliate dan chat WhatsApp yang masuk.

## Positioning

Dolanin menampilkan pilihan murah yang sudah diseleksi pemilik (kurasi), plus promo atau harga khusus. Pengunjung tidak perlu menyaring ribuan hasil di OTA besar.

## Operating Context

- Pengunjung menjelajah dari HP, menyaring berdasarkan **kota, harga, dan tipe**, dan mengurutkan berdasarkan **harga**.
- Setiap item di katalog punya halaman detail sebelum keluar ke situs partner.
- Admin mengisi konten (foto/video, data, link affiliate, nomor WhatsApp) lewat CMS.

## Capabilities and Constraints

- Isi katalog hanya akomodasi. Tipe: **Hotel**, **Penginapan** (homestay, guest house, dan sejenisnya), **Villa**. Tempat wisata dan transportasi tidak termasuk.
- Filter: kota, harga, tipe. Urutan: harga.
- Klik kartu katalog selalu membuka halaman detail dulu. Dari detail ada dua CTA: Pesan (link affiliate milik klien, keluar ke partner) dan Chat WhatsApp (ke nomor klien yang tercantum di web).
- Media item: foto dan/atau video vertikal 9:16 (konten klien yang sudah ada di IG/TikTok). Kalau item punya video, halaman detail dibuka dengan video setinggi layar (autoplay, muted, loop). Kalau tidak ada video, halaman dibuka dengan galeri foto 4:5. Video di-upload sebagai file lewat CMS, bukan embed IG/TikTok. Ini keputusan sementara yang dianggap disetujui, dan ruang penyimpanan videonya belum dipilih.
- CMS: hanya satu akun admin (dipakai bersama oleh pembuat web dan klien), tanpa role. Admin bisa CRUD listing dan kota, serta mengatur nomor WA default (nomor per listing opsional). Ada dashboard berisi klik Pesan, klik WA, dan kunjungan halaman detail.
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

1. Jalan menuju Pesan atau WhatsApp harus selalu terlihat, terutama di HP.
2. Harga murah dan promo adalah alasan utama orang datang. Tampilkan dengan jujur dan jelas.
3. Kurasi, bukan banjir pilihan: lebih sedikit item tapi meyakinkan.
4. HP dulu. Desktop adalah perluasan, bukan versi utama.
