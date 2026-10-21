#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${AGROSYS_DIR:-/var/www/agrosys}"

if [[ ! -f "$APP_DIR/package.json" || ! -f "$APP_DIR/.env" ]]; then
  echo "AgroSys o su archivo .env no existen en $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"
git pull --ff-only
npm ci
npm run check
npm test
npm run migrate
npm run build
pm2 reload deploy/ecosystem.config.cjs --env production --update-env
pm2 save

curl --fail --silent --show-error http://127.0.0.1:4000/health
echo
echo "AgroSys actualizado correctamente."
