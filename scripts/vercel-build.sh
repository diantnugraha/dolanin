#!/bin/sh
# Migrate only on production deploys; a failed migrate fails the build (set -e).
# MIGRATE_CMD / BUILD_CMD are overridable only for local dry-run checks.
set -e
if [ "$VERCEL_ENV" = "production" ]; then
  ${MIGRATE_CMD:-npx prisma migrate deploy}
else
  echo "VERCEL_ENV=${VERCEL_ENV:-unset}: skipping prisma migrate deploy"
fi
${BUILD_CMD:-npx next build}
