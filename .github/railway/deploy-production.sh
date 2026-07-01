#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-273da88e-d4fc-46c6-b9d9-b3ca4ef2ce33}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT_NAME:-production}"
ENV_FILE="${ENV_FILE:-.env.production}"

WEB_SERVICE="${RAILWAY_WEB_SERVICE:-Avenire Web}"
BACKEND_SERVICE="${RAILWAY_BACKEND_SERVICE:-Avenire Backend}"
DURABLE_SERVICE="${RAILWAY_DURABLE_SERVICE:-Durable Streams}"

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI is required. Install it with: npm i -g @railway/cli" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Generate it with .github/railway/export-production-env.sh or provide it in CI." >&2
  exit 1
fi

if [[ -z "${RAILWAY_TOKEN:-}" && -z "${RAILWAY_API_TOKEN:-}" ]]; then
  echo "RAILWAY_TOKEN or RAILWAY_API_TOKEN must be set for non-interactive deploys." >&2
  exit 1
fi

railway link --project "$PROJECT_ID" --environment "$ENVIRONMENT" --json >/dev/null

set_service_var() {
  local service="$1"
  local key="$2"
  local value="$3"

  printf '%s' "$value" | railway variable set \
    "$key" \
    --stdin \
    --environment "$ENVIRONMENT" \
    --service "$service" \
    --skip-deploys >/dev/null
}

sync_env_to_service() {
  local service="$1"
  local app_role="$2"

  echo "Syncing $ENV_FILE to $service"
  set_service_var "$service" "APP_ROLE" "$app_role"

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"

    case "$key" in
      APP_ROLE|RAILWAY_*|PORT)
        continue
        ;;
    esac

    set_service_var "$service" "$key" "$value"
  done < "$ENV_FILE"
}

deploy_service() {
  local service="$1"
  local summary="$2"

  echo "Deploying $service"
  railway up \
    --detach \
    --project "$PROJECT_ID" \
    --environment "$ENVIRONMENT" \
    --service "$service" \
    -m "$summary"
}

sync_env_to_service "$WEB_SERVICE" "web"
sync_env_to_service "$BACKEND_SERVICE" "backend"

if [[ "${DEPLOY_DURABLE_STREAMS:-0}" == "1" ]]; then
  echo "DEPLOY_DURABLE_STREAMS=1 requested; setting Durable Streams APP_ROLE only."
  set_service_var "$DURABLE_SERVICE" "APP_ROLE" "durable"
  deploy_service "$DURABLE_SERVICE" "Deploy durable streams from GitHub Actions"
fi

deploy_service "$WEB_SERVICE" "Deploy web from GitHub Actions"
deploy_service "$BACKEND_SERVICE" "Deploy backend from GitHub Actions"

echo "Deploys queued. Check Railway for terminal SUCCESS before treating production as updated."
