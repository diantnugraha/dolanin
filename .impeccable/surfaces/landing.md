---
version: 1
slug: "landing"
primary_target: "landing"
related_targets: []
---

## Scope

Landing Dolanin + alur katalog → detail (pengunjung, HP dulu). Mode: Persuade di landing, Operate di katalog/detail.

## Audience, job, action

Wisatawan lokal yang mencari hotel dan villa murah di kota tujuan. Tujuan halaman: pengunjung memilih kota, menemukan item terkurasi, lalu klik Pesan (link affiliate) atau Chat WhatsApp.

## Direction contract

THESIS: Landing berupa papan tujuan. Kota dulu, karena wisatawan lokal memutuskan "ke mana" sebelum "nginep di mana". Arah ini menolak dua pola umum: form pencarian ala OTA (tanggal, tamu) dan hero foto + tagline generik.

OWN-WORLD: Brand Dolanin yang sudah dikunci. Latar Pasir #FFF6EC, teks Malam #1F2A37, Jingga #F26B3A khusus untuk harga dan aksi utama, Biru laut #0E8C8C untuk tanda kota/arah, Kuning senja #FFC24B untuk stempel promo. Font Poppins 400–700, kartu radius 16px, tombol pill, ikon outline 1.5px, foto asli. Warna selalu flat: tanpa gradient, tanpa glass.

STORY: Pengunjung melihat "Mau dolan ke mana?" bersama foto kota sungguhan, tap kotanya, mendapat katalog kurasi yang bisa difilter (kota, harga, tipe) dan diurutkan berdasarkan harga, membuka detail, lalu menekan Pesan atau WA.

FIRST VIEWPORT: Lebar 390px. Bar tipis berisi logo dan tombol cari. Judul display 32/700 rata kiri dua baris. Segmen tipe Semua / Hotel / Villa. Papan kota 2 kolom: tile foto asli rasio 4:5, nama kota di kiri bawah, "mulai Rp…" dan jumlah pilihan. Baris promo mengintip di bawah lipatan.

SIGNATURE: Tap tile kota → tile membesar menjadi header katalog (view transition, shared element).

FORM: Kota Dulu, nomor 2 di daftar urut, seed key e397a141.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Copy

Tagline (opsi C pilihan user): "Yuk, dolan! Nginepnya biar hemat, jalan-jalannya puas." Kata "hemat" diberi stabilo Kuning senja. Subline: "Kasih kamu rekomendasi villa dan hotel di berbagai daerah! Info booking tersedia di OTA resmi atau direct via WhatsApp." Jangan pakai frasa "sudah kami pilihkan".

## Responsive

HP (versi utama): satu kolom, papan kota 2 kolom, dock Pesan/WA menempel di bawah. Desktop (1280): hero 5/7 berisi tagline dan papan kota 3×2; katalog dengan sidebar filter sticky dan grid 3 kolom; detail dengan mosaik media (video 9:16 sebagai tile tinggi) dan kartu pesan sticky di kanan.

## Unresolved

Rating ditampilkan atau tidak; kota awal; nomor WA global atau per item.
