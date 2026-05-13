@echo off
setlocal

cd /d "%~dp0"

echo Deteniendo servicios Nimbus...
docker compose down
if errorlevel 1 (
  echo [ERROR] No se pudo detener docker compose.
  exit /b 1
)

echo [OK] Servicios detenidos.
exit /b 0
