#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[health] web:"
curl -fsS "http://127.0.0.1:${WEB_PORT:-80}/" >/dev/null && echo "  OK"

echo "[health] api:"
curl -fsS "http://127.0.0.1:${WEB_PORT:-80}/api/health"
