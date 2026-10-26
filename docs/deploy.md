# Panduan deploy produksi Dolanin

Panduan ini dijalankan oleh pemilik (butuh akun cloud). Tidak ada nilai rahasia di sini; isi sendiri di dashboard Vercel, jangan di-commit.

Urutan: 1 Prasyarat, 2 Database, 3 S3 + CloudFront, 4 Bunny Stream, 5 Vercel, 6 Deploy + admin pertama, 7 Smoke test, 8 Catatan operasional.

## 1. Prasyarat dan biaya ringkas

| Layanan | Paket | Perkiraan biaya |
|---|---|---|
| Vercel | Pro | Berbayar per bulan per anggota tim (cek [vercel.com/pricing](https://vercel.com/pricing)) |
| Postgres (Neon, `aws-ap-southeast-1` Singapura) | Free | Gratis selama masih di batas free tier |
| Bunny Stream | Bayar sesuai pemakaian (storage + trafik) | Kecil di awal; cek halaman harga Bunny |
| AWS S3 + CloudFront | CloudFront paket Free, S3 bayar sesuai pemakaian | Hampir nol untuk traffic awal |

Angka pasti bisa berubah; cek halaman harga masing-masing sebelum mendaftar. Siapkan juga: domain, AWS CLI/akses console, `openssl`, dan Node sesuai repo.

## 2. Database (Neon)

1. Buat project di Neon, region **AWS Singapore (`aws-ap-southeast-1`)**.
2. Di Connect, ambil dua connection string:
   - **Pooled** (hostname mengandung `-pooler`) untuk `DATABASE_URL`. Dipakai aplikasi saat runtime (`lib/db.ts` lewat `@prisma/adapter-pg`).
   - **Direct / unpooled** (tanpa `-pooler`) untuk `DIRECT_URL`. Dipakai hanya untuk migrasi.
3. Kenapa dua: Prisma 7 menghapus `directUrl`; CLI (`prisma migrate`) hanya membaca `datasource.url` di `prisma.config.ts`. Repo ini membaca `DIRECT_URL` dulu, lalu jatuh ke `DATABASE_URL` bila `DIRECT_URL` kosong. Neon menyarankan koneksi direct untuk migrasi ([Prisma config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference), [Neon + Prisma](https://neon.com/docs/guides/prisma)).
4. Migrasi berjalan otomatis di setiap build Vercel lewat script `vercel-build` (`prisma migrate deploy && next build`).

## 3. S3 + CloudFront (foto)

Foto diupload langsung dari browser ke S3 lewat presigned URL, dan dibaca lewat CloudFront.

1. **Bucket S3** privat di `ap-southeast-3` (Jakarta). Biarkan Block Public Access aktif semua.
2. **CloudFront**: buat distribusi paket **Free**, origin = bucket di atas, akses origin lewat **Origin Access Control (OAC)** (signing: sign requests). Catat domain `dxxxx.cloudfront.net`.
3. **Bucket policy** agar hanya distribusi itu yang boleh baca (ganti `BUCKET`, `ACCOUNT_ID`, `DIST_ID`):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::BUCKET/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DIST_ID" } }
  }]
}
```

4. **CORS bucket** (Permissions, CORS). Ganti domain produksi:

```json
[
  {
    "AllowedOrigins": ["https://DOMAIN-PRODUKSI", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

5. **IAM user** khusus aplikasi (tanpa akses console), policy hanya ini:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::BUCKET/*"
  }]
}
```

   Buat access key untuk user itu.
6. Nilai env: `S3_BUCKET` = nama bucket, `S3_REGION` = `ap-southeast-3`, `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` = key IAM tadi, `NEXT_PUBLIC_MEDIA_CDN_URL` = `https://dxxxx.cloudfront.net` (tanpa slash di akhir).

Sumber: [OAC untuk S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [CORS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html).

## 4. Bunny Stream (video)

1. Buat **Stream Library**.
2. Aktifkan **MP4 Fallback** (di pengaturan library; pilih resolusi 720p). Tanpa ini `play_720p.mp4` tidak ada.
3. **Webhook**: set ke `https://{domain}/api/bunny/webhook?token={BUNNY_WEBHOOK_TOKEN}`. `BUNNY_WEBHOOK_TOKEN` = string acak panjang buatanmu (mis. `openssl rand -hex 32`); sama persis dengan env di Vercel.
4. **Allowed referrers** = domain produksi (tambahkan `localhost` hanya jika perlu tes lokal).
5. Pemetaan nilai:
   - `BUNNY_LIBRARY_ID` = ID library (angka).
   - `BUNNY_API_KEY` = API key library (bukan API key akun).
   - `NEXT_PUBLIC_BUNNY_CDN_HOST` = hostname pull zone library, bentuk `vz-xxxx.b-cdn.net` (tanpa `https://`).

Catatan: nama menu persis di dashboard Bunny dapat berbeda; halaman dokumentasi Bunny tidak bisa dibaca saat pengembangan, jadi nama pengaturan di atas belum diverifikasi dari dokumen.

## 5. Vercel

1. Buat proyek **Pro**, import repo, branch produksi.
2. Region function **Singapore (`sin1`)**: sudah di `vercel.json` (`"regions": ["sin1"]`), yang menimpa Project Settings, Functions ([docs](https://vercel.com/docs/functions/configuring-functions/region)). Default proyek baru adalah `iad1`, jadi pastikan di deployment summary region-nya `sin1`.
3. Environment Variables (Production), semua dari `.env.example`:

| Env | Asal nilai |
|---|---|
| `DATABASE_URL` | Neon pooled (bagian 2) |
| `DIRECT_URL` | Neon direct (bagian 2) |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | `https://{domain}` tanpa slash akhir |
| `NEXT_PUBLIC_MEDIA_CDN_URL` | URL CloudFront (bagian 3) |
| `S3_BUCKET`, `S3_REGION` | Bagian 3 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | IAM user bagian 3 |
| `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY` | Bagian 4 |
| `NEXT_PUBLIC_BUNNY_CDN_HOST` | Pull zone host Bunny |
| `BUNNY_WEBHOOK_TOKEN` | String acak, sama dengan di URL webhook |

   Variabel `NEXT_PUBLIC_*` ditanam saat build; ubah nilainya berarti harus redeploy.
4. **Domain**: Settings, Domains, tambahkan domain dan ikuti instruksi DNS. Setelah aktif, perbarui `NEXT_PUBLIC_SITE_URL`, CORS S3, webhook dan allowed referrer Bunny dengan domain final.

## 6. Deploy dan admin pertama

1. Deploy (push ke branch produksi). Build menjalankan `prisma migrate deploy` lalu `next build`.
2. Buat admin dari laptop, terhadap DB produksi. Export env produksi hanya di shell, jangan simpan ke file yang masuk git:

```bash
DATABASE_URL='<url produksi>' npm run admin:password -- <username> <password>
```

   Pakai URL direct atau pooled, keduanya bisa. Jangan jalankan seed di produksi (`prisma/seed.ts` berisi data contoh).
3. **Lupa password**: jalankan perintah yang sama dengan password baru.

## 7. Smoke test

Dasar:
- [ ] `curl -sI https://{domain}/` mengembalikan 200.
- [ ] Login di `/admin`, buat kota (`/admin/kota`) dan satu listing dengan foto dan video.
- [ ] Halaman detail memutar video di HP sungguhan.

Verifikasi yang tidak bisa dilakukan saat pengembangan (tidak ada kredensial):
- [ ] **(a) Foto**: upload foto pertama; file di S3 muncul sebagai `p/...-800.webp` dan `p/...-1600.webp`, dan tampil lewat URL CloudFront.
- [ ] **(b) Video**: upload TUS selesai; webhook membuat status menjadi READY; `https://{pull-zone}/{guid}/play_720p.mp4` terputar dan `https://{pull-zone}/{guid}/thumbnail.jpg` termuat. Dua format URL ini TIDAK bisa diverifikasi dari dokumentasi Bunny (halaman 404). Cek dulu; kalau berbeda, satu-satunya tempat yang diubah adalah `videoSrc` / `videoPoster` di `lib/media.ts`.
- [ ] **(c)** `curl -sI https://{domain}/go/{id}/pesan` mengembalikan `302` dengan `location` berupa link affiliate.
- [ ] **(d)** Dashboard admin menghitung klik tadi.
- [ ] **(e)** Overlay poster pada mosaik tampil benar di Safari (WebKit); baru diuji di Chromium.

## 8. Catatan operasional

- **Daftar kota awal** masih menunggu keputusan pemilik; isi lewat `/admin/kota`.
- **Biaya bulanan**: Vercel Pro adalah biaya tetap utama; Neon dan CloudFront Free ditargetkan nol; S3 dan Bunny naik mengikuti jumlah/ukuran media dan trafik video. Pantau tagihan bulan pertama.
- **Log**: Vercel dashboard, tab Logs (runtime) dan Deployments (build, termasuk output migrasi). Webhook Bunny yang gagal terlihat sebagai 401 (token salah) di log function `/api/bunny/webhook`.
- Migrasi baru ikut ter-deploy otomatis; backup/restore DB lewat fitur Neon.
