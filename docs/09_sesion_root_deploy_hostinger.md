# 09 - Sesión despliegue desde raíz

## 1. Objetivo de la sesión
Dejar el proyecto totalmente desplegable desde la raíz para Hostinger, sin depender de subcarpetas.

## 2. Cambios implementados
- Se añadió `docker-compose.yml` en raíz con servicios `web`, `api`, `worker`, `redis`, `postgres`.
- Se añadieron archivos de entorno ejemplo en raíz:
  - `.env.example`
  - `.env.api.example`
  - `.env.worker.example`
- Se añadieron scripts operativos en raíz:
  - `scripts/preflight.sh`
  - `scripts/up.sh`
  - `scripts/down.sh`
  - `scripts/logs.sh`
  - `scripts/health.sh`
- Se actualizó documentación para operar desde raíz:
  - `DEPLOY_HOSTINGER.md`
  - `RUNBOOK.md`

## 3. Archivos modificados
- `DEPLOY_HOSTINGER.md`
- `RUNBOOK.md`

## 4. Archivos creados
- `docker-compose.yml`
- `.env.example`
- `.env.api.example`
- `.env.worker.example`
- `scripts/preflight.sh`
- `scripts/up.sh`
- `scripts/down.sh`
- `scripts/logs.sh`
- `scripts/health.sh`

## 5. Validaciones ejecutadas
- Verificación manual de estructura de despliegue en raíz.
- Revisión de comandos de operación para evitar rutas relativas a `deploy/hostinger`.

## 6. Riesgos pendientes
- Validar en el VPS real que puertos 80/443 estén abiertos.
- Confirmar DNS y SSL final del dominio en Hostinger.

## 7. Próximo paso recomendado
Clonar en Hostinger, copiar `.env*`, ejecutar `./scripts/up.sh` y validar con `./scripts/health.sh`.
