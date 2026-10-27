# Panduan deploy produksi Dolanin (VPS)

Panduan ini membawa Dolanin dari VPS kosong sampai online dengan HTTPS, backup harian, dan cara update. Database PostgreSQL ada di server terpisah yang sudah kamu punya. Tidak ada nilai rahasia di file ini. Semua rahasia hanya ditulis di `.env` di server, tidak pernah di-commit.

**Susunan produksi**

```
Pengunjung ──HTTPS──> Caddy (port 443) ──> Next.js (127.0.0.1:3000) ──> PostgreSQL (server terpisah)
Browser admin ──upload langsung──> Bunny Storage (foto) dan Bunny Stream (video)
Pengunjung <──foto dan video dari CDN── Bunny
```

VPS hanya melayani halaman web; foto dan video tidak pernah lewat VPS.

**Contoh nilai di panduan ini** (ganti dengan punyamu):

| Contoh | Artinya |
|---|---|
| `ubuntu` | user bawaan VPS (Tencent Lighthouse Ubuntu memakai `ubuntu`) |
| `IP_VPS` | IP publik VPS |
| `dolanin.id` | domain produksi |
| `~/dolanin` | folder aplikasi di server (`/home/ubuntu/dolanin`) |

Urutan: 1 Persiapan, 2 Server, 3 Software, 4 Database, 5 Bunny Storage, 6 Bunny Stream, 7 Kode dan `.env`, 8 Build dan admin pertama, 9 Service, 10 Domain dan HTTPS, 11 Sambungkan Bunny ke domain, 12 Smoke test, 13 Update aplikasi, 14 Backup dan restore, 15 Operasional.

## 1. Persiapan

- **VPS**: Ubuntu **24.04 LTS**, lokasi Jakarta (atau Singapura), minimal **2 vCPU / 4 GB RAM**. `next build` butuh sekitar 1,5–2 GB RAM.
- **Domain**: buat DNS record **A** `@` dan `www` ke `IP_VPS` sekarang, karena perubahan DNS butuh waktu. Untuk tes tanpa domain berbayar, subdomain DuckDNS (`dolanin.duckdns.org`) juga bisa.
- **Firewall VPS** (di console provider, Tencent: Lighthouse, Firewall): hanya buka **TCP 22, 80, 443**. Jangan buka 3000.
- **Database**: PostgreSQL di server terpisah (Sumobase), dengan URL Transaction Pooler dan Direct Connection (bagian 4).
- **Kode di branch `main`**. Server mengambil kode dari `main`, jadi gabungkan perubahan ke `main` dulu.
- **Biaya**: VPS bulanan, domain tahunan, dan Bunny (Storage + Stream) bayar sesuai pemakaian.

## 2. Siapkan server

Dari laptop:

```bash
ssh ubuntu@IP_VPS
```

Di server:

```bash
sudo apt update && sudo apt upgrade -y
```

**Login pakai SSH key (disarankan).** Dari laptop: `ssh-copy-id ubuntu@IP_VPS`. Buka terminal baru dan pastikan `ssh ubuntu@IP_VPS` masuk tanpa password. Baru setelah itu matikan login password:

```bash
echo 'PasswordAuthentication no' | sudo tee /etc/ssh/sshd_config.d/00-no-password.conf
sudo systemctl restart ssh
```

Kalau terkunci, masuk lewat terminal web di console provider.

**Swap 2 GB** (pengaman saat build). Cek dulu `free -h`; kalau baris `Swap` masih 0:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Biarkan zona waktu server UTC. Statistik dashboard sudah dihitung dalam WIB oleh database.

## 3. Pasang software

**Node.js 24 LTS** (didukung sampai April 2028; seluruh tes lolos di Node 24; [NodeSource](https://github.com/nodesource/distributions)):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs git
node -v
```

**Klien PostgreSQL** (`psql` untuk tes koneksi, `pg_dump` untuk backup). Server database-nya tidak dipasang di VPS. Pakai repo resmi PostgreSQL ([postgresql.org](https://www.postgresql.org/download/linux/ubuntu/)) supaya versi klien sama dengan server database (Sumobase: PostgreSQL 16; `pg_dump` harus sama atau lebih baru dari server). Script kedua meminta tekan Enter:

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-client-16
```

**Caddy** (web server dengan HTTPS otomatis; [caddyserver.com](https://caddyserver.com/docs/install)):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## 4. Database

Database ada di server terpisah (Sumobase, Jakarta). Aplikasi memakai dua URL dari halaman **Database Connection Methods** Sumobase, keduanya diakhiri `?sslmode=require`:

| Env | Tab di Sumobase | Dipakai untuk |
|---|---|---|
| `DATABASE_URL` | **Transaction Pooler** (port 6432) | aplikasi saat berjalan |
| `DIRECT_URL` | **Direct Connection** (port 65432) | migrasi (`prisma migrate deploy`) dan backup (`pg_dump`) |

Kenapa dua: mesin migrasi Prisma memakai *prepared statement* bernama yang tidak didukung transaction pooler (error `prepared statement "s1" already exists`, atau macet bila lewat SSL). Aplikasinya sendiri berjalan normal lewat pooler. `prisma.config.ts` otomatis memakai `DIRECT_URL` untuk migrasi, dan `scripts/backup-db.sh` juga. Teruji 27 Oktober 2026 (PostgreSQL 16.14): migrasi, backup, dan aplikasi (termasuk transaksi) berjalan.

Setelah mengganti password di Sumobase, perbarui password di **kedua** URL.

**Syarat di server database:**
- **Database khusus Dolanin**, tidak dipakai bersama aplikasi lain. User di `DATABASE_URL` harus pemilik database itu (atau punya hak `CREATE` di schema `public`), karena migrasi membuat tabelnya sendiri. Kalau belum ada, jalankan di server database:

  ```sql
  CREATE ROLE dolanin LOGIN PASSWORD '<password-acak>';
  CREATE DATABASE dolanin OWNER dolanin;
  ```

- **Nama database tidak berakhiran `_dev`/`_test`.** Seed (data contoh yang mengganti password admin dengan password dev di repo) hanya mau jalan di database berakhiran itu.
- **PostgreSQL 14 ke atas.**
- **Hanya IP VPS yang boleh terhubung** (firewall atau allowlist di server database). Port 5432 jangan terbuka untuk semua IP.
- **Lokasi berdekatan dengan VPS** (data center sama atau satu kota). Setiap halaman menjalankan beberapa query; jarak jauh langsung terasa lambat.
- **SSL**: koneksi lewat internet, jadi kedua URL wajib `?sslmode=require`. Sertifikat Sumobase (Let's Encrypt) dipercaya Node, jadi aplikasi memverifikasinya penuh.

**Tes dari VPS** (URL ditempel lalu Enter; tidak tampil di layar dan tidak masuk history):

```bash
read -s DATABASE_URL
psql "$DATABASE_URL" -c 'select version();'
read -s DIRECT_URL
psql "$DIRECT_URL" -c 'select version();'
```

Keduanya harus menampilkan versi PostgreSQL. Kalau timeout, IP VPS belum diizinkan di server database. Tes ketiga (driver yang dipakai aplikasi) ada di bagian 8.

**Jangan pernah jalankan seed atau reset di database produksi** (`npx prisma db seed`, `prisma migrate dev`, `prisma migrate reset`).

## 5. Bunny Storage (foto)

Foto diupload langsung dari browser ke Bunny Storage lewat presigned URL (API S3-compatible), lalu dibaca lewat Pull Zone Bunny.

1. **Storage Zone** dengan **S3 compatibility aktif**. Opsi ini hanya bisa dipilih saat zone dibuat. Upload selalu masuk ke region utama zone (endpoint S3-nya mengikuti region utama); region replikasi dipakai untuk pengiriman.
2. **Pull Zone** dengan origin = Storage Zone tadi. Catat hostname-nya, mis. `dolanin.b-cdn.net`.
3. **Cache di Pull Zone**: set cache expiration (edge) dan browser cache expiration ke **1 tahun**. Pull Zone belum memakai metadata `Cache-Control` yang tersimpan di objek, jadi cache diatur di sini. Aman, karena key foto tidak pernah ditimpa (upload baru = key baru, folder `p/`).
4. **CORS upload**: tidak perlu diatur. Endpoint S3 Bunny selalu menjawab `Access-Control-Allow-Origin: *`.
5. Nilai env (dari halaman Credentials Storage Zone):
   - `S3_ENDPOINT` = S3 Region Endpoint URL, mis. `https://sg-s3.storage.bunnycdn.com`
   - `S3_REGION` = kode region di endpoint itu, mis. `sg`
   - `S3_BUCKET` dan `AWS_ACCESS_KEY_ID` = nama Storage Zone
   - `AWS_SECRET_ACCESS_KEY` = **Password** (bukan Read-only password; aplikasi perlu upload dan hapus)
   - `NEXT_PUBLIC_MEDIA_CDN_URL` = `https://{hostname pull zone}` (tanpa slash di akhir)

Sumber: [Bunny Storage S3](https://bunny.net/docs/storage/s3), [replikasi](https://bunny.net/docs/storage/replication). Nama menu persis di dashboard Bunny bisa berbeda dari panduan ini.

## 6. Bunny Stream (video)

Video diupload langsung dari browser ke Bunny Stream (TUS), lalu diputar sebagai file MP4 biasa (bukan player iframe Bunny).

1. Buat **Video Library** (Stream, Add Video Library). Pilih region penyimpanan yang mencakup **Asia (Singapura)**.
2. Bagian **Encoding**:
   - Pastikan resolusi **480p** dan **720p** aktif.
   - Aktifkan **MP4 Fallback**. Pemutar mencoba `play_720p.mp4`, lalu `play_480p.mp4`, lalu hanya menampilkan poster (tanpa kontrol putar).
   - Aktifkan SEBELUM upload video pertama: video yang diupload sebelum MP4 Fallback aktif tidak pernah mendapat file MP4 (hapus lalu upload ulang).
3. Bagian **Security**. Situs memutar file MP4 dan `thumbnail.jpg` langsung lewat `<video>`/`<img>`, tanpa token:
   - **Token Authentication: mati** (juga di Pull Zone library: API, Pull Zone, Manage, Security). Kalau aktif, semua MP4 dan thumbnail menjawab 403.
   - **Allowed domains**: diisi di bagian 11 setelah domain aktif. Untuk tes lokal tambahkan `localhost:3000` (Bunny ikut mencocokkan port; `localhost` saja tetap 403).
4. Bagian **API**, pemetaan nilai:
   - `BUNNY_LIBRARY_ID` = Video Library ID (angka).
   - `BUNNY_API_KEY` = API Key library (bukan API key akun, bukan Read-only).
   - `NEXT_PUBLIC_BUNNY_CDN_HOST` = CDN Hostname, bentuk `vz-xxxx.b-cdn.net` (tanpa `https://`). Ini berbeda dari Pull Zone foto.
   - Webhook URL diisi di bagian 11.

Sumber: [MP4 Fallback](https://bunny.net/docs/stream/mp4-downloads), [struktur file dan thumbnail](https://bunny.net/docs/stream/storage-structure), [webhook](https://bunny.net/docs/stream/webhooks), [dashboard](https://bunny.net/docs/stream/dashboard). Nama menu persis di dashboard bisa sedikit berbeda.

## 7. Ambil kode dan isi `.env`

**Akses repo.** Kalau repo GitHub privat, buat deploy key khusus server (hanya baca):

```bash
ssh-keygen -t ed25519 -C "dolanin-vps" -f ~/.ssh/dolanin_deploy -N ""
cat ~/.ssh/dolanin_deploy.pub
```

Tempel isinya di GitHub: repo, Settings, Deploy keys, Add deploy key (jangan centang write access). Lalu:

```bash
printf 'Host github.com\n  IdentityFile ~/.ssh/dolanin_deploy\n' >> ~/.ssh/config
git clone git@github.com:diantnugraha/dolanin.git ~/dolanin
cd ~/dolanin
```

Kalau repo publik: `git clone https://github.com/diantnugraha/dolanin.git ~/dolanin`.

**Isi `.env`** (`nano ~/dolanin/.env`). Satu nilai per baris, tanpa tanda kutip, tanpa spasi, dan tanpa komentar di belakang nilai:

```
DATABASE_URL=<URL Transaction Pooler, diakhiri ?sslmode=require>
DIRECT_URL=<URL Direct Connection, diakhiri ?sslmode=require>
SESSION_SECRET=<hasil openssl rand -hex 32>
NEXT_PUBLIC_SITE_URL=https://dolanin.id
NEXT_PUBLIC_MEDIA_CDN_URL=https://<pull-zone-foto>.b-cdn.net
S3_ENDPOINT=https://sg-s3.storage.bunnycdn.com
S3_REGION=sg
S3_BUCKET=<nama storage zone foto>
AWS_ACCESS_KEY_ID=<nama storage zone foto>
AWS_SECRET_ACCESS_KEY=<password storage zone foto>
BUNNY_LIBRARY_ID=<video library id>
BUNNY_API_KEY=<api key library>
NEXT_PUBLIC_BUNNY_CDN_HOST=vz-xxxx.b-cdn.net
BUNNY_WEBHOOK_TOKEN=<hasil openssl rand -hex 32, beda dari SESSION_SECRET>
BACKUP_STORAGE_ZONE=
BACKUP_STORAGE_HOST=
BACKUP_STORAGE_PASSWORD=
```

Tiga baris `BACKUP_*` diisi di bagian 14. Lalu kunci file-nya:

```bash
chmod 600 ~/dolanin/.env
```

`NEXT_PUBLIC_SITE_URL` dipakai untuk link listing di pesan WhatsApp dan preview link saat dibagikan. Semua `NEXT_PUBLIC_*` ditanam saat build: setiap kali diubah, jalankan update (bagian 13).

## 8. Build dan admin pertama

```bash
cd ~/dolanin
npm ci
```

Tes koneksi dengan driver yang sama dengan aplikasi (driver ini memperlakukan `sslmode=require` sebagai verifikasi sertifikat penuh, beda dari `psql`):

```bash
node -e "process.loadEnvFile('.env'); const c = new (require('pg').Client)({ connectionString: process.env.DATABASE_URL }); c.connect().then(() => c.query('select 1')).then(() => { console.log('Koneksi DB OK'); return c.end(); }).catch((e) => { console.error('Koneksi DB GAGAL:', e.message); process.exit(1); })"
```

Satu baris `SECURITY WARNING` tentang `sslmode` di output itu wajar: driver memberi tahu bahwa `require` diperlakukan sebagai verifikasi penuh. Kalau gagal dengan pesan sertifikat (mis. `self-signed certificate`) padahal `psql` di bagian 4 berhasil, berhenti di sini dan sesuaikan pengaturan SSL dulu.

Lalu migrasi dan build:

```bash
npx prisma migrate deploy
npm run build
```

Buat akun admin. Awali dengan **satu spasi** agar password tidak tersimpan di history shell. Password minimal 10 karakter:

```bash
 npm run admin:password -- <username> <password>
```

**Lupa password**: jalankan perintah yang sama dengan password baru. Semua sesi login lama otomatis keluar.

## 9. Jalankan sebagai service

Supaya aplikasi hidup terus dan otomatis menyala lagi setelah crash atau reboot:

```bash
sudo tee /etc/systemd/system/dolanin.service > /dev/null <<'EOF'
[Unit]
Description=Dolanin (Next.js)
After=network-online.target
Wants=network-online.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/dolanin
Environment=NODE_ENV=production
ExecStart=/home/ubuntu/dolanin/node_modules/.bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now dolanin
curl -sI http://127.0.0.1:3000/ | head -1
```

Hasil yang benar: `HTTP/1.1 200 OK`. Aplikasi hanya mendengarkan `127.0.0.1`, jadi tidak bisa dibuka langsung dari internet; jalurnya lewat Caddy.

## 10. Domain dan HTTPS

Pastikan DNS sudah mengarah ke VPS: `getent hosts dolanin.id` harus menampilkan `IP_VPS`. Lalu:

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
dolanin.id {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}

www.dolanin.id {
	redir https://dolanin.id{uri} permanent
}
EOF
sudo systemctl reload caddy
curl -sI https://dolanin.id/ | head -1
```

Caddy mengambil sertifikat HTTPS sendiri (Let's Encrypt) dan memperpanjangnya otomatis. Kalau gagal, lihat `journalctl -u caddy -n 50`: biasanya DNS belum mengarah ke VPS, atau port 80/443 belum dibuka di firewall provider.

HTTPS wajib: cookie login admin hanya dikirim lewat HTTPS. Caddy meneruskan header `Host` asli, yang dibutuhkan form admin (server action Next.js).

## 11. Sambungkan Bunny ke domain

Di Bunny Stream, library-mu:

1. Bagian **API**, kolom **Webhook URL**: `https://dolanin.id/api/bunny/webhook?token=<BUNNY_WEBHOOK_TOKEN>`. Webhook mengubah status video dari "Sedang diproses" ke siap tayang secara otomatis.
2. Bagian **Security**, **Allowed domains**: tambahkan `dolanin.id` (tanpa `https://`). `localhost:3000` boleh tetap ada untuk tes lokal.

Bunny Storage tidak perlu diubah.

## 12. Smoke test

- [ ] `curl -sI https://dolanin.id/` mengembalikan 200, dan `http://dolanin.id` dialihkan ke HTTPS.
- [ ] Login di `https://dolanin.id/admin`, buat kota (`/admin/kota`) dan satu listing dengan foto dan video.
- [ ] **Foto**: file muncul di Storage Zone sebagai `p/...-800.webp` dan `p/...-1600.webp` dan tampil di situs. Hapus satu foto di CMS; kedua file ikut hilang dari Storage Zone.
- [ ] **Video**: setelah encode selesai, status di CMS berubah sendiri jadi siap (tanpa klik Simpan ulang; ini bukti webhook jalan). Video terputar di HP sungguhan. Kalau 403, cek bagian 6 langkah 3 dan Allowed domains.
- [ ] **Klik**: `curl -sI https://dolanin.id/go/{id}/pesan` mengembalikan `302` ke link affiliate. `curl -sI` mengirim HEAD, yang sengaja tidak dihitung sebagai klik; untuk menguji hitungan, klik tombol Pesan sungguhan di browser, lalu cek dashboard admin.
- [ ] Overlay poster pada mosaik tampil benar di Safari (baru diuji di Chromium).
- [ ] Backup pertama berhasil (bagian 14).

## 13. Update aplikasi

Setelah perubahan masuk ke `main`:

```bash
sh ~/dolanin/scripts/deploy.sh
```

Script ini: `git pull`, `npm ci`, `prisma migrate deploy`, `npm run build`, lalu restart service. Selama build (1–2 menit) situs bisa error sesaat, jadi jalankan saat sepi. Script mencetak versi sebelum update.

**Rollback** kalau versi baru bermasalah (ganti `<versi>` dengan yang dicetak script):

```bash
cd ~/dolanin
git checkout <versi>
npm ci && npm run build && sudo systemctl restart dolanin
```

Migrasi database tidak ikut mundur. Untuk kembali normal ke versi terbaru: `git checkout main` lalu jalankan `deploy.sh` lagi.

## 14. Backup dan restore

Foto dan video sudah aman di Bunny; yang perlu di-backup hanya database (listing, kota, pengaturan, admin, statistik klik).

**Siapkan tempat backup di Bunny**: buat Storage Zone baru khusus backup (mis. `dolanin-backup`, region Singapura), **tanpa Pull Zone**. Jangan simpan backup di Storage Zone foto: zone itu punya Pull Zone, jadi isinya bisa diunduh publik. Lalu isi di `.env`:

```
BACKUP_STORAGE_ZONE=dolanin-backup
BACKUP_STORAGE_HOST=sg.storage.bunnycdn.com
BACKUP_STORAGE_PASSWORD=<password storage zone backup>
```

`BACKUP_STORAGE_HOST` mengikuti region utama zone backup: Frankfurt `storage.bunnycdn.com`, Singapura `sg.storage.bunnycdn.com`, lainnya `{kode}.storage.bunnycdn.com` ([Bunny Storage API](https://bunny.net/docs/storage/http)). Password ada di halaman FTP & API Access zone itu.

**Tes sekali:**

```bash
sh ~/dolanin/scripts/backup-db.sh
ls -lh ~/backups
```

Pastikan file `dolanin-YYYY-MM-DD.dump` juga muncul di Storage Zone backup.

**Jadwal harian.** `crontab -e`, tambahkan baris (19.00 UTC = 02.00 WIB):

```
0 19 * * * sh /home/ubuntu/dolanin/scripts/backup-db.sh >> /home/ubuntu/backup-db.log 2>&1
```

Server menyimpan dump 7 hari terakhir di `~/backups`; salinan di Bunny tidak dihapus otomatis (ukurannya kecil, hapus sesekali dari dashboard).

**Restore:**

```bash
cd ~/dolanin
DB=$(grep '^DIRECT_URL=' .env | cut -d= -f2-)
sudo systemctl stop dolanin
pg_restore --clean --if-exists --no-owner -d "$DB" ~/backups/dolanin-YYYY-MM-DD.dump
sudo systemctl start dolanin
```

Kalau VPS hilang, unduh dulu dari Bunny ke server baru:

```bash
curl -fsS -H "AccessKey: <password storage zone backup>" -o dolanin.dump https://sg.storage.bunnycdn.com/dolanin-backup/dolanin-YYYY-MM-DD.dump
```

## 15. Operasional

- **Log aplikasi**: `journalctl -u dolanin -f`. Log Caddy: `journalctl -u caddy -f`. Webhook Bunny dengan token salah muncul sebagai 401 untuk `/api/bunny/webhook`.
- **Restart**: `sudo systemctl restart dolanin`.
- **Update sistem**: patch keamanan Ubuntu terpasang otomatis (unattended-upgrades). Sebulan sekali: `sudo apt update && sudo apt upgrade -y`, lalu `sudo reboot` bila diminta.
- **Disk**: `df -h`.
- **Video tertahan "Sedang diproses"**: kalau webhook terlewat, buka listing di CMS lalu Simpan; status ditanyakan ulang ke Bunny. Video "Gagal diproses" harus dihapus lalu diunggah ulang.
- **Batas video**: maksimal 4 menit, 300 MB, vertikal 9:16.
- **Rate limit** (opsional, kalau ada bot yang menggelembungkan klik): Caddy belum punya rate limit bawaan. Pilihannya plugin `caddy-ratelimit`, atau Cloudflare (gratis) di depan domain.
- **Daftar kota awal** masih menunggu keputusan pemilik; isi lewat `/admin/kota`.
