# Dolanin

## Catatan dependency

`package.json` memuat blok `overrides` yang mengunci keluarga `@typescript-eslint` ke 8.72.0. Penyebabnya: pada 2026-10-27 registry npm mengembalikan 404 untuk tarball 8.72.1 (versi terdaftar tapi file tidak ada). Hapus blok `overrides` begitu `npm i` berhasil tanpa blok itu.

## Media

Dev and E2E use `NEXT_PUBLIC_MEDIA_CDN_URL=/dev-media` (served from `public/dev-media`, works on any port). Production uses the CloudFront URL.
