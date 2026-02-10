#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT="${1:-}"

echo "[deploy-functions] Repository: $ROOT_DIR"
if [[ -n "$PROJECT" ]]; then
  echo "[deploy-functions] Target project: $PROJECT"
  npm run firebase:deploy -- --only functions --project "$PROJECT"
else
  echo "[deploy-functions] Target project: default (current firebase context)"
  npm run firebase:deploy -- --only functions
fi

echo "[deploy-functions] Completed"
