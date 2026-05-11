#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/preflight.sh

echo "[deploy] levantando stack..."
docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build

echo "[deploy] estado de contenedores:"
docker compose -f docker-compose.hostinger.yml ps

echo "[deploy] health API:"
curl -fsS http://localhost/api/health || {
  echo "[deploy] fallo healthcheck API"
  exit 1
}

echo "[deploy] OK"
