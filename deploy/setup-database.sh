#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Crea usuario/base Postgres sin borrar una base existente y aplica las
# migraciones versionadas de AgroCAP. PostgreSQL/PostGIS y npm ci deben estar instalados.
APP_DIR="${AGROCAP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="$APP_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe $ENV_FILE. Copia .env.production.example a .env y configura DATABASE_URL." >&2
  exit 1
fi
if ! command -v psql >/dev/null || ! command -v npm >/dev/null || ! command -v node >/dev/null; then
  echo "Se requieren PostgreSQL (psql), Node.js y npm instalados." >&2
  exit 1
fi

set -a
# .env debe contener asignaciones compatibles con Bash, sin comandos.
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL no está configurada en $ENV_FILE." >&2
  exit 1
fi

mapfile -t db_config < <(node --input-type=module -e '
  const url = new URL(process.env.DATABASE_URL);
  for (const value of [url.hostname, url.port || "5432", decodeURIComponent(url.pathname.slice(1)), decodeURIComponent(url.username), decodeURIComponent(url.password)]) console.log(value);
')
if [[ "${#db_config[@]}" -ne 5 ]]; then
  echo "No se pudo interpretar DATABASE_URL." >&2
  exit 1
fi
DB_HOST="${db_config[0]}"
DB_PORT="${db_config[1]}"
DB_NAME="${db_config[2]}"
DB_USER="${db_config[3]}"
DB_PASSWORD="${db_config[4]}"

if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" && "$DB_HOST" != "::1" ]]; then
  echo "Por seguridad, este instalador solo crea bases en PostgreSQL local; host detectado: $DB_HOST" >&2
  exit 1
fi
if [[ -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
  echo "DATABASE_URL debe incluir base, usuario y contraseña." >&2
  exit 1
fi

sudo -u postgres env DB_PASSWORD="$DB_PASSWORD" psql --port="$DB_PORT" --set=ON_ERROR_STOP=1 \
  --set=db_name="$DB_NAME" --set=db_user="$DB_USER" <<'SQL'
\getenv db_password DB_PASSWORD
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')
\gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_password')
\gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')
\gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'db_user')
\gexec
SQL

sudo -u postgres psql --port="$DB_PORT" --set=ON_ERROR_STOP=1 --dbname="$DB_NAME" \
  --command='CREATE EXTENSION IF NOT EXISTS postgis;'

cd "$APP_DIR"
npm run migrate

echo "Base de datos AgroCAP lista: $DB_NAME en $DB_HOST."
echo "Se aplicaron las migraciones. Para cargar datos demo, ejecuta opcionalmente: npm run seed"
