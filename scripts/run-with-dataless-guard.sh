#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/run-with-dataless-guard.sh --repo -- <command> [args...]
  bash scripts/run-with-dataless-guard.sh --paths <path> [<path> ...] -- <command> [args...]

Examples:
  bash scripts/run-with-dataless-guard.sh --repo -- turbo run lint
  bash scripts/run-with-dataless-guard.sh --paths . -- tsc --noEmit -p tsconfig.check.json
EOF
}

mode=""
declare -a guard_args=()

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --repo)
      mode="repo"
      shift
      ;;
    --paths)
      mode="paths"
      shift
      while [[ "$#" -gt 0 && "$1" != "--" ]]; do
        guard_args+=("$1")
        shift
      done
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$mode" ]]; then
  echo "Expected either --repo or --paths." >&2
  usage >&2
  exit 2
fi

if [[ "$mode" == "paths" && "${#guard_args[@]}" -eq 0 ]]; then
  echo "--paths requires at least one path." >&2
  usage >&2
  exit 2
fi

if [[ "$#" -eq 0 ]]; then
  echo "Expected a command after --." >&2
  usage >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
doctor_script="$script_dir/report-dataless-files.sh"

if [[ "$mode" == "repo" ]]; then
  bash "$doctor_script"
else
  bash "$doctor_script" "${guard_args[@]}"
fi

exec "$@"
