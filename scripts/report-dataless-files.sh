#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This check is macOS-specific; skipping on $(uname -s)."
  exit 0
fi

usage() {
  cat <<'EOF'
Usage: bash scripts/report-dataless-files.sh [--summary] [--limit N|--all] [paths...]

Examples:
  bash scripts/report-dataless-files.sh
  bash scripts/report-dataless-files.sh --summary --limit 20
  bash scripts/report-dataless-files.sh apps/web packages/auth
EOF
}

show_summary=1
sample_limit=20
declare -a roots=()

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --summary)
      show_summary=1
      ;;
    --all)
      sample_limit=-1
      ;;
    --limit)
      shift
      if [[ $# -eq 0 || ! "$1" =~ ^[0-9]+$ ]]; then
        echo "Expected a numeric value after --limit." >&2
        usage >&2
        exit 2
      fi
      sample_limit="$1"
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

repo_root="$(pwd -P)"
sync_prone_path_warning=""
case "$repo_root" in
  "$HOME/Desktop"/*|"$HOME/Documents"/*)
    sync_prone_path_warning="Repository path is under a sync-prone location: $repo_root"
    ;;
esac

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

count="${#dataless_files[@]}"

if [[ "$count" -gt 0 ]]; then
  echo "Found $count dataless placeholder files." >&2
  echo "See docs/local-workspace-integrity.md for remediation." >&2
  if [[ -n "$sync_prone_path_warning" ]]; then
    echo "$sync_prone_path_warning" >&2
    echo "Moving the repo to a non-synced local dev path is strongly recommended." >&2
  fi

  if [[ "$show_summary" -eq 1 ]]; then
    echo "Summary:" >&2
    printf '%s\n' "${dataless_files[@]}" | awk -F/ '
      {
        if ($1 == "." && $2 != "") key = $2;
        else if ($1 == "apps" && $2 != "") key = $1 "/" $2;
        else if ($1 == "packages" && $2 != "") key = $1 "/" $2;
        else if ($1 == "docs") key = "docs";
        else key = $1;
        counts[key]++;
      }
      END {
        for (key in counts) {
          print counts[key] "\t" key;
        }
      }
    ' | sort -nr >&2
    echo >&2
  fi

  if [[ "$sample_limit" -ne 0 ]]; then
    echo "Sample paths:" >&2
    printed=0
    for file in "${dataless_files[@]}"; do
      echo "${file#./}" >&2
      printed=$((printed + 1))
      if [[ "$sample_limit" -ge 0 && "$printed" -ge "$sample_limit" ]]; then
        break
      fi
    done

    if [[ "$sample_limit" -ge 0 && "$count" -gt "$sample_limit" ]]; then
      echo
      echo "Showing first $sample_limit of $count paths." >&2
    fi
  fi

  echo
  exit 1
fi

echo "No dataless placeholder files found."
