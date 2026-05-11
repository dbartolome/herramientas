#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/../.." && pwd)"

echo "[update] actualizando código..."
cd "$REPO_DIR"
git pull --ff-only origin main

echo "[update] desplegando..."
cd "$ROOT_DIR"
./scripts/deploy.sh
