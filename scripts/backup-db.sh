#!/bin/sh
# Backup DB produksi (VPS), dijalankan cron tiap malam. Panduan: docs/deploy.md bagian 14.
# Simpan dump 7 hari terakhir di ~/backups, lalu salin ke Storage Zone backup Bunny (privat, tanpa Pull Zone)
# bila BACKUP_STORAGE_ZONE diisi di .env.
set -eu
cd "$(dirname "$0")/.."
env_get() { grep "^$1=" .env | cut -d= -f2- || true; }

DIR="$HOME/backups"
# Optional label, e.g. `pre-deploy` from scripts/deploy.sh: dolanin-YYYY-MM-DD-pre-deploy.dump
FILE="$DIR/dolanin-$(date -u +%F)${1:+-$1}.dump"
mkdir -p "$DIR"
# Direct connection when set: a transaction pooler is not meant for pg_dump.
DB=$(env_get DIRECT_URL)
[ -n "$DB" ] || DB=$(env_get DATABASE_URL)
pg_dump -Fc --no-owner "$DB" > "$FILE"

ZONE=$(env_get BACKUP_STORAGE_ZONE)
if [ -n "$ZONE" ]; then
  curl -fsS -X PUT \
    -H "AccessKey: $(env_get BACKUP_STORAGE_PASSWORD)" \
    -H "Content-Type: application/octet-stream" \
    --upload-file "$FILE" \
    "https://$(env_get BACKUP_STORAGE_HOST)/$ZONE/$(basename "$FILE")" > /dev/null
fi

find "$DIR" -name 'dolanin-*.dump' -mtime +7 -delete
echo "$(date -u +%FT%TZ) backup ok: $FILE"
