@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ==============================================
echo   Nimbus - Arranque local en Windows
 echo ==============================================

docker --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker no esta instalado o no esta en PATH.
  echo Instala Docker Desktop y vuelve a ejecutar este script.
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Desktop no esta iniciado.
  echo Abre Docker Desktop, espera a que arranque y repite.
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo [OK] Creado .env desde .env.example
  ) else (
    echo [WARN] No existe .env.example. Continua sin crear .env
  )
)

if not exist ".env.api" (
  if exist ".env.api.example" (
    copy /Y ".env.api.example" ".env.api" >nul
    echo [OK] Creado .env.api desde .env.api.example
  ) else (
    echo [WARN] No existe .env.api.example. Continua sin crear .env.api
  )
)

if not exist ".env.worker" (
  if exist ".env.worker.example" (
    copy /Y ".env.worker.example" ".env.worker" >nul
    echo [OK] Creado .env.worker desde .env.worker.example
  ) else (
    echo [WARN] No existe .env.worker.example. Continua sin crear .env.worker
  )
)

echo.
echo [1/2] Construyendo y levantando servicios...
docker compose up -d --build
if errorlevel 1 (
  echo [ERROR] Fallo al levantar docker compose.
  exit /b 1
)

echo.
echo [2/2] Estado de servicios:
docker compose ps

echo.
echo ==============================================
echo Plataforma levantada.
echo Frontend: http://localhost:8080
echo API:      http://localhost:3000/api/health
echo ==============================================

echo.
set /p OPEN_BROWSER="Quieres abrir la app en el navegador ahora? (S/N): "
if /I "%OPEN_BROWSER%"=="S" (
  start "" "http://localhost:8080"
)

exit /b 0
