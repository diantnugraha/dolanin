# Link pemesanan per channel: desain

Status: disetujui pemilik untuk dibangun (29 Oktober 2026, "oke, lanjut buat"). Keputusan 1–12 adalah keputusan builder yang dicatat di sini; pemilik bisa mengoreksinya.
Spec induk: `2026-10-26-dolanin-design.md`. Dokumen ini menggantikan tombol "Pesan" (satu link affiliate) dan "Chat WhatsApp" (nomor) di spec induk.
Mockup yang disetujui: `2026-10-29-booking-channels/mockup.html` (versi 5).

## Maksud

Pemilik punya link untuk satu listing di beberapa OTA dan di WhatsApp. Pengunjung memilih sendiri tempat memesan yang mereka percaya atau sudah punya akun, dan pemilik melihat channel mana yang paling banyak diklik.

## Keputusan pemilik

- Enam channel, urutan tetap: **Agoda, Traveloka, Trip.com, tiket.com, Booking.com, WhatsApp**.
- Di form listing (CMS), admin mengisi link untuk channel mana pun. Channel yang dikosongkan tidak tampil di halaman detail.
- Tombol "Pesan" dan "Chat WhatsApp" di halaman detail dihapus, diganti satu tombol per channel yang diisi.
- WhatsApp per listing diisi sebagai **link**, bukan nomor.
- Bentuk tombol: kotak dengan sudut membulat (radius 12px), bukan pil atau lingkaran. Isinya **logo lengkap brand saja**, tanpa teks tambahan.
- HP (bar bawah yang menempel): 1 sampai 3 channel dibagi rata selebar layar. Lebih dari 3: kotak berlebar tetap, baris bisa digeser kiri-kanan.
- Desktop (kartu samping): setiap channel jadi kotak bertumpuk berisi logo dan panah.
- Logo diambil dari internet (sumber di bagian Aset).
- Dashboard menghitung klik **per channel**.

## Keputusan saya (pemilik bisa mengoreksi)

1. **Minimal satu link untuk listing yang tayang.** Link WhatsApp ikut dihitung, karena pesan langsung via WhatsApp adalah channel yang sah (lihat teks landing: "direct via WhatsApp"). Draf boleh tanpa link. Ini menjaga prinsip produk: jalan memesan selalu terlihat.
2. **Domain link tidak dicek.** Link affiliate sering lewat jaringan affiliate atau short link (mis. `invol.co`), jadi setiap kolom cukup harus berupa URL `http(s)`.
3. **Nomor WA default di Pengaturan tidak lagi dipakai halaman detail.** Nomor itu tetap dipakai tombol "Tanya via WA" di header dan blok WhatsApp di landing. Teks petunjuk di Pengaturan diperbarui.
4. **Pesan WA otomatis** (nama listing + link listing) tidak lagi dibuat. Admin menulis teks sendiri di link (contoh di petunjuk form: `https://wa.me/628…?text=Halo%2C%20...`).
5. **Data listing lama dipindahkan saat migrasi:**
   - `affiliateUrl` masuk ke channel sesuai domainnya: `agoda.com`, `traveloka.com`, `trip.com`, `tiket.com`, `booking.com`, termasuk subdomain (mis. `www.agoda.com`).
   - **Link dengan domain lain tidak dibuang.** Short link affiliate seperti `invol.co` sering dipakai, jadi kasus ini justru yang paling mungkin terjadi. Link itu disimpan di kolom sementara `legacyUrl`, lalu:
     - Form listing di CMS menampilkannya di bagian Link pemesanan: "Link lama belum masuk channel mana pun: … Salin ke kolom yang sesuai."
     - Daftar listing CMS menandai listing itu **"Cek link lama"**.
     - Kolom itu dikosongkan otomatis saat listing disimpan lagi.
   - Nomor WA per listing, atau nomor default bila listing tidak punya nomor sendiri, menjadi link `https://wa.me/{nomor}`. Dengan begitu, tombol WhatsApp yang sekarang tampil tidak hilang.
   - Kolom `affiliateUrl` dan `waNumber` dihapus setelah datanya dipindahkan.
   - Satu migrasi, tanpa masa transisi. Selama update di VPS, situs memang boleh error 1–2 menit (lihat `docs/deploy.md`).
6. **Data klik lama:**
   - Klik WA menjadi klik WhatsApp.
   - Klik Pesan menjadi klik channel hasil pemetaan domain link listingnya saat migrasi, atau **"Lainnya"** bila domainnya tidak dikenal.
   - Kunjungan tetap kunjungan.
7. **URL klik** menjadi `/go/{id}/{channel}`, dengan `channel` salah satu dari `agoda`, `traveloka`, `trip`, `tiket`, `booking`, `whatsapp`.
   - Link lama `/go/{id}/pesan` diarahkan ke channel non-WhatsApp pertama listing, atau ke WhatsApp bila hanya itu yang ada; `/go/{id}/wa` diarahkan ke WhatsApp. Ini untuk halaman yang masih tersimpan di cache.
   - Klik dicatat atas channel tujuan akhirnya.
   - Channel yang tidak diisi menghasilkan 404. Permintaan HEAD tetap tidak dihitung sebagai klik.
8. **Dashboard per channel:**
   - KPI: **Total klik** (hero), **Kunjungan halaman detail**, **Rasio klik** (klik ÷ kunjungan), **Channel teratas** (nama + persentase dari total klik; "Lainnya" tidak bisa menjadi channel teratas).
   - "Klik per hari": satu garis, total klik.
   - **"Klik per channel"** (baru): batang horizontal per channel berisi ikon, nama, jumlah, dan persentase dari total klik, diurutkan dari yang terbanyak. Klik lama tanpa channel tampil sebagai "Lainnya", selalu di baris terakhir, supaya persentasenya tetap berjumlah 100%. Channel dengan 0 klik tidak ditampilkan.
   - "Klik per kota": menghitung total klik, bukan hanya klik Pesan.
   - "Listing paling banyak diklik": kolom Kunjungan, Klik, Channel teratas, Rasio.
   - "Belum ada klik": tetap.
   - Filter rentang, kota, dan tipe tetap seperti sekarang.
9. **Dua bentuk logo:** logo lengkap di halaman detail, dan ikon persegi kecil di CMS (label kolom link) serta dashboard.
10. **Aksesibilitas:**
    - Nama setiap tombol "Pesan di Agoda" (dan seterusnya) dan "Chat via WhatsApp"; logonya sendiri dekoratif.
    - Baris yang bisa digeser tetap bisa dipakai dengan keyboard (Tab menggeser ke kotak yang difokus).
    - Tanda "masih ada lagi" adalah kotak yang terpotong di tepi layar, bukan bayangan atau gradien, karena pemilik melarang gradien.
11. **Model data:**
    - Tabel `ListingLink` (`listingId`, `channel`, `url`), unik per (`listingId`, `channel`).
    - Enum `BookingChannel` (`AGODA`, `TRAVELOKA`, `TRIP`, `TIKET`, `BOOKING`, `WHATSAPP`), yang urutannya juga urutan tampil.
    - `Event` memakai `kind` `VIEW` atau `CLICK`, ditambah kolom `channel` (boleh kosong; kosong berarti klik lama "Lainnya").
    - `Listing.legacyUrl` (boleh kosong): link affiliate lama yang domainnya tidak dikenal (lihat keputusan 5).
12. **"Channel teratas" per listing** di dashboard tidak memperhitungkan klik "Lainnya".

## Aset

Semua file ada di `2026-10-29-booking-channels/`.

**Logo lengkap** (`logos/`, PNG tinggi 96px, dipotong rapat, latar transparan). Semua sumber Wikimedia Commons berstatus public domain:

| Channel | Sumber |
|---|---|
| Agoda | `Agoda Logo 2022.svg` |
| Traveloka | `Logo Traveloka.png` |
| Trip.com | `Trip.com logo.svg` |
| tiket.com | `Tiket.com logo.png` |
| Booking.com | `Booking.com Logo.svg` |
| WhatsApp | ikon datar `WhatsApp Logo green.svg` + tulisan dari `WhatsApp logo.svg`, warna teks `#111B21` |

Tinggi tampil di HP agar logo terlihat sama besar (dirapatkan atas masukan pemilik 29 Oktober 2026: dock 91px, kotak 44px, kotak geser 104px):
- 2 channel atau lebih: Agoda 24px, Booking.com 13px, lainnya 16px.
- 1 channel: Agoda 28px, lainnya 19px.
- Kartu desktop tetap 56px per baris: Agoda 28px, Booking.com 17px, lainnya 21px.
- Ukuran di atas adalah batas maksimum: di kotak yang sempit, logo mengecil mengikuti rasionya dan tidak pernah melebihi kotak.

**Ikon persegi** (`icons/`, PNG 96×96):
- Traveloka, Trip.com, WhatsApp: ikon aplikasi resmi (App Store).
- Booking.com: tanda resmi "B." (Simple Icons).
- Agoda (huruf "a" + lima titik) dan tiket.com (lingkaran kuning + "tiket" di kotak biru `#0064D2`): disusun ulang dalam resolusi tinggi dari logo resmi, mengikuti favicon resmi mereka yang hanya 32–48px.

Logo adalah merek dagang pemiliknya dan hanya dipakai untuk menautkan ke listing di platform tersebut.

## Di luar cakupan

- Menambah atau mengubah daftar channel dari CMS. Daftarnya tetap di kode.
- Mengecek apakah link masih aktif.
- Harga berbeda per channel.

## Diserahkan ke builder

Struktur komponen, CSS rinci, nama file, bentuk query, dan cara mengujinya, selama hasilnya sama dengan mockup v5 dan keputusan di atas.
