#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${AUTH_LOCAL_DB_DATA_DIR:-$ROOT_DIR/output/local-postgres-auth}"
DOCKER_CONTAINER_NAME="${AUTH_LOCAL_DB_CONTAINER_NAME:-avenire-auth-pgvector}"

if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
  echo "No local auth Postgres data directory found at $DATA_DIR"
  exit 0
fi

pg_ctl -D "$DATA_DIR" stop -m fast >/dev/null 2>&1 || true
docker rm -f "$DOCKER_CONTAINER_NAME" >/dev/null 2>&1 || true
echo "Stopped local auth Postgres at $DATA_DIR"
