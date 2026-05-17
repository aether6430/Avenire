#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${AUTH_LOCAL_DB_DATA_DIR:-$ROOT_DIR/output/local-postgres-auth}"
DB_NAME="${AUTH_LOCAL_DB_NAME:-avenire}"
DB_PORT="${AUTH_LOCAL_DB_PORT:-5433}"
DB_USER="${AUTH_LOCAL_DB_USER:-$(id -un)}"
DOCKER_CONTAINER_NAME="${AUTH_LOCAL_DB_CONTAINER_NAME:-avenire-auth-pgvector}"
DOCKER_IMAGE="${AUTH_LOCAL_DB_IMAGE:-pgvector/pgvector:pg16}"
LOG_FILE="$DATA_DIR/server.log"
DATABASE_URL="postgres://${DB_USER}@localhost:${DB_PORT}/${DB_NAME}"

ensure_extension() {
  local extension_name="$1"
  local output=""

  if output="$(psql "$DATABASE_URL" -tA -c "create extension if not exists ${extension_name};" 2>&1)"; then
    return 0
  fi

  if [[ "$output" == *"extension \"${extension_name}\" is not available"* ]]; then
    return 2
  fi

  echo "$output"
  exit 1
}

start_docker_pgvector() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Local Postgres is missing pgvector and Docker is not available."
    echo "Install pgvector locally or install/start Docker, then rerun pnpm auth:local-db-start."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Local Postgres is missing pgvector and Docker is not running."
    echo "Start Docker Desktop (or another Docker daemon), then rerun pnpm auth:local-db-start."
    exit 1
  fi

  echo "Falling back to Dockerized pgvector using ${DOCKER_IMAGE}"
  docker rm -f "$DOCKER_CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d \
    --name "$DOCKER_CONTAINER_NAME" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_HOST_AUTH_METHOD=trust \
    -p "$DB_PORT":5432 \
    "$DOCKER_IMAGE" >/dev/null

  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if pg_isready -h localhost -p "$DB_PORT" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! pg_isready -h localhost -p "$DB_PORT" >/dev/null 2>&1; then
    echo "Dockerized pgvector did not become ready on port $DB_PORT."
    echo "Check docker logs $DOCKER_CONTAINER_NAME for details."
    exit 1
  fi
}

if lsof -nP -iTCP:"$DB_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $DB_PORT is already in use. Reuse that database or stop it before starting the local auth Postgres helper."
  exit 1
fi

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
  echo "Initializing local Postgres data directory at $DATA_DIR"
  initdb -D "$DATA_DIR" -A trust --username="$DB_USER" >/dev/null
fi

echo "Starting local Postgres on port $DB_PORT"
pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-p $DB_PORT" start >/dev/null

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if pg_isready -h localhost -p "$DB_PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! pg_isready -h localhost -p "$DB_PORT" >/dev/null 2>&1; then
  echo "Local Postgres did not become ready on port $DB_PORT."
  echo "Check $LOG_FILE for details."
  exit 1
fi

createdb -h localhost -p "$DB_PORT" "$DB_NAME" 2>/dev/null || true

echo "Ensuring local extensions"
if ensure_extension vector; then
  :
else
  extension_status=$?
  if [ "$extension_status" -eq 2 ]; then
    pg_ctl -D "$DATA_DIR" stop -m fast >/dev/null 2>&1 || true
    start_docker_pgvector
    ensure_extension vector
  else
    exit "$extension_status"
  fi
fi
ensure_extension pgcrypto

echo "Running migrations against $DATABASE_URL"
DATABASE_URL="$DATABASE_URL" pnpm db:migrate

echo "Local auth Postgres ready:"
echo "  DATABASE_URL=$DATABASE_URL"
echo "Next steps:"
echo "  pnpm auth:local-verify-link <email> --approve-waitlist"
