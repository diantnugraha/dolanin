#!/bin/sh
# Update produksi di VPS. Jalankan dari mana saja: sh ~/dolanin/scripts/deploy.sh
# Situs bisa error 1-2 menit selama build; jalankan saat sepi. Panduan: docs/deploy.md bagian 13.
set -e
cd "$(dirname "$0")/.."
PREV=$(git rev-parse --short HEAD)
echo "Versi sebelum update: $PREV (rollback: docs/deploy.md bagian 13)"
git pull --ff-only
npm ci
# A migration may change data the previous version reads: keep a dump from right before it (rollback = restore it).
sh scripts/backup-db.sh pre-deploy
npx prisma migrate deploy
npm run build
sudo systemctl restart dolanin
echo "Selesai: $(git rev-parse --short HEAD)"
