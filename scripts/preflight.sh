#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[preflight] comprobando archivos..."
required_files=(
  ".env"
  ".env.api"
  ".env.worker"
  "docker-compose.yml"
)
for f in "${required_files[@]}"; do
  [[ -f "$f" ]] || { echo "[preflight] faltante: $f"; exit 1; }
done

echo "[preflight] comprobando docker..."
command -v docker >/dev/null 2>&1 || { echo "[preflight] docker no encontrado"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[preflight] docker compose no disponible"; exit 1; }

echo "[preflight] validando variables..."
grep -q "^POSTGRES_PASSWORD=.*" .env || { echo "[preflight] POSTGRES_PASSWORD no definido"; exit 1; }
grep -q "^ADMIN_TOKEN=.*" .env.api || { echo "[preflight] ADMIN_TOKEN no definido"; exit 1; }
grep -q "^ADMIN_PASSWORD=.*" .env.api || { echo "[preflight] ADMIN_PASSWORD no definido"; exit 1; }

echo "[preflight] OK"
