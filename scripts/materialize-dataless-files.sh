#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This helper is macOS-specific; skipping on $(uname -s)."
  exit 0
fi

usage() {
  cat <<'EOF'
Usage: bash scripts/materialize-dataless-files.sh [options] [paths...]

Options:
  --limit N       maximum number of dataless files to attempt (default: 20)
  --timeout SEC   per-file materialization timeout in seconds (default: 3)
  --all           attempt every matched dataless file
  --dry-run       show which files would be targeted without touching them
  --help, -h      show this help

Examples:
  bash scripts/materialize-dataless-files.sh
  bash scripts/materialize-dataless-files.sh --limit 5 apps/web
  bash scripts/materialize-dataless-files.sh --dry-run --all .
EOF
}

limit=20
timeout_seconds=3
dry_run=0
declare -a roots=()

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --limit)
      shift
      if [[ $# -eq 0 || ! "$1" =~ ^[0-9]+$ ]]; then
        echo "Expected a numeric value after --limit." >&2
        usage >&2
        exit 2
      fi
      limit="$1"
      ;;
    --timeout)
      shift
      if [[ $# -eq 0 || ! "$1" =~ ^[0-9]+$ ]]; then
        echo "Expected a numeric value after --timeout." >&2
        usage >&2
        exit 2
      fi
      timeout_seconds="$1"
      ;;
    --all)
      limit=-1
      ;;
    --dry-run)
      dry_run=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      while [[ "$#" -gt 0 ]]; do
        roots+=("$1")
        shift
      done
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      roots+=("$1")
      ;;
  esac
  shift
done

if [[ "${#roots[@]}" -eq 0 ]]; then
  roots=(
    "apps"
    "packages"
    "docs"
    "README.md"
    "ARCHITECTURE.md"
  )
fi

patterns=(
  "*.ts"
  "*.tsx"
  "*.js"
  "*.jsx"
  "*.md"
  "*.mdx"
  "*.json"
  "*.yaml"
  "*.yml"
  "*.css"
)

declare -a candidates=()
declare -a dataless_files=()
declare -a dataless_files_sorted=()

collect_paths() {
  local root="$1"
  if [[ -f "$root" ]]; then
    candidates+=("$root")
    return
  fi
  if [[ ! -d "$root" ]]; then
    return
  fi

  local find_args=("$root" -type f "(")
  local first=1
  local pattern
  for pattern in "${patterns[@]}"; do
    if [[ $first -eq 0 ]]; then
      find_args+=(-o)
    fi
    find_args+=(-name "$pattern")
    first=0
  done
  find_args+=(")" -print0)

  while IFS= read -r -d '' file; do
    candidates+=("$file")
  done < <(find "${find_args[@]}")
}

for root in "${roots[@]}"; do
  collect_paths "$root"
done

if [[ "${#candidates[@]}" -eq 0 ]]; then
  echo "No matching files found."
  exit 0
fi

for file in "${candidates[@]}"; do
  metadata="$(ls -ldO "$file" 2>/dev/null || true)"
  if [[ "$metadata" == *"dataless"* ]]; then
    dataless_files+=("$file")
  fi
done

total="${#dataless_files[@]}"

if [[ "$total" -eq 0 ]]; then
  echo "No dataless placeholder files found."
  exit 0
fi

repo_root="$(pwd -P)"
echo "Found $total dataless placeholder files."
echo "Working root: $repo_root"
echo "Selection strategy: smallest files first."

while IFS=$'\t' read -r _size path; do
  dataless_files_sorted+=("$path")
done < <(
  for file in "${dataless_files[@]}"; do
    size="$(stat -f '%z' "$file" 2>/dev/null || echo 0)"
    printf '%s\t%s\n' "$size" "$file"
  done | sort -n -k1,1
)

if [[ "$limit" -ge 0 && "$total" -gt "$limit" ]]; then
  echo "Targeting first $limit files."
fi

target_count="$total"
if [[ "$limit" -ge 0 && "$total" -gt "$limit" ]]; then
  target_count="$limit"
fi

if [[ "$dry_run" -eq 1 ]]; then
  echo "Dry run only. Target files:"
  for ((i=0; i<target_count; i++)); do
    echo "${dataless_files_sorted[$i]}"
  done
  exit 0
fi

materialized=0
still_dataless=0
timed_out=0

for ((i=0; i<target_count; i++)); do
  file="${dataless_files_sorted[$i]}"
  if /usr/bin/python3 - "$timeout_seconds" "$file" <<'PY' >/dev/null 2>&1
import subprocess
import sys

timeout_seconds = int(sys.argv[1])
path = sys.argv[2]

try:
    subprocess.run(
        ["/bin/cat", path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=timeout_seconds,
    )
except subprocess.TimeoutExpired:
    raise SystemExit(124)
except subprocess.CalledProcessError as error:
    raise SystemExit(error.returncode)
PY
  then
    :
  else
    timed_out=$((timed_out + 1))
  fi

  metadata="$(ls -ldO "$file" 2>/dev/null || true)"
  if [[ "$metadata" == *"dataless"* ]]; then
    still_dataless=$((still_dataless + 1))
  else
    materialized=$((materialized + 1))
  fi
done

echo
echo "Materialized: $materialized"
echo "Still dataless: $still_dataless"
echo "Timed out: $timed_out"

if [[ "$still_dataless" -gt 0 ]]; then
  exit 1
fi

exit 0
