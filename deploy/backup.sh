#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${AGROSYS_DIR:-/var/www/agrosys}"
BACKUP_DIR="${AGROSYS_BACKUP_DIR:-/var/backups/agrosys}"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "No se encontró $APP_DIR/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
set +a

mkdir -p "$BACKUP_DIR"
marca_tiempo="$(date +%Y-%m-%d_%H-%M-%S)"
archivo="$BACKUP_DIR/agrosys_${marca_tiempo}.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$archivo" "$DATABASE_URL"
directorio_archivos="${UPLOADS_DIR:-uploads}"
if [[ "$directorio_archivos" != /* ]]; then
  directorio_archivos="$APP_DIR/$directorio_archivos"
fi
if [[ -d "$directorio_archivos" ]]; then
  tar -czf "$BACKUP_DIR/agrosys_archivos_${marca_tiempo}.tar.gz" -C "$directorio_archivos" .
fi
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'agrosys_*' -mtime +14 -delete
echo "Backup de base de datos creado: $archivo"
if [[ -f "$BACKUP_DIR/agrosys_archivos_${marca_tiempo}.tar.gz" ]]; then
  echo "Backup de archivos creado: $BACKUP_DIR/agrosys_archivos_${marca_tiempo}.tar.gz"
fi
