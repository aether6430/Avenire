#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-273da88e-d4fc-46c6-b9d9-b3ca4ef2ce33}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT_NAME:-production}"
SERVICE="${RAILWAY_WEB_SERVICE:-Avenire Web}"
ENV_FILE="${ENV_FILE:-.env.production}"

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI is required. Install it with: npm i -g @railway/cli" >&2
  exit 1
fi

railway link --project "$PROJECT_ID" --environment "$ENVIRONMENT" --json >/dev/null

railway variable list \
  --environment "$ENVIRONMENT" \
  --service "$SERVICE" \
  --kv > "$ENV_FILE"

chmod 600 "$ENV_FILE"
echo "Wrote $SERVICE $ENVIRONMENT variables to $ENV_FILE"
