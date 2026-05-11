#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/preflight.sh

echo "[up] construyendo y levantando servicios..."
docker compose up -d --build

echo "[up] estado:"
docker compose ps
