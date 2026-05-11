#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[preflight] verificando archivos requeridos..."
required_files=(
  ".env"
  ".env.api"
  ".env.worker"
  "docker-compose.hostinger.yml"
)

for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "[preflight] faltante: $f"
    exit 1
  fi
done

echo "[preflight] verificando comandos requeridos..."
command -v docker >/dev/null 2>&1 || { echo "[preflight] docker no encontrado"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[preflight] docker compose no disponible"; exit 1; }

echo "[preflight] validando variables críticas..."
if ! grep -q "^POSTGRES_PASSWORD=.*" .env; then
  echo "[preflight] POSTGRES_PASSWORD no definido en .env"
  exit 1
fi
if grep -q "^POSTGRES_PASSWORD=change-this-postgres-password$" .env; then
  echo "[preflight] cambia POSTGRES_PASSWORD por un valor real"
  exit 1
fi

if ! grep -q "^ADMIN_TOKEN=.*" .env.api; then
  echo "[preflight] ADMIN_TOKEN no definido en .env.api"
  exit 1
fi
if ! grep -q "^ADMIN_PASSWORD=.*" .env.api; then
  echo "[preflight] ADMIN_PASSWORD no definido en .env.api"
  exit 1
fi

echo "[preflight] OK"
