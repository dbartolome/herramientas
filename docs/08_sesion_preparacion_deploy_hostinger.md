# 08 - Sesión preparación deploy Hostinger

## 1. Objetivo de la sesión
Preparar el proyecto para despliegue en Hostinger VPS con Docker, variables por entorno y documentación operativa.

## 2. Cambios implementados
- Configuración frontend para API base dinámica (`runtime-config.js`) evitando `localhost` hardcodeado en producción.
- API NestJS con `CORS_ORIGINS` configurable por entorno.
- API NestJS con Swagger habilitable/deshabilitable por `ENABLE_SWAGGER`.
- Dockerfiles de producción para:
  - API (`platform/apps/api/Dockerfile`)
  - Worker (`platform/workers/security_worker/Dockerfile`)
  - Web (`platform/apps/web/Dockerfile`)
- Configuración Nginx para servir frontend y proxyear `/api` y `/docs`.
- Orquestación de producción en `deploy/hostinger/docker-compose.hostinger.yml`.
- Variables de entorno ejemplo para Hostinger:
  - `.env.hostinger.example`
  - `.env.api.example`
  - `.env.worker.example`
- Documentación de despliegue y operación:
  - `DEPLOY_HOSTINGER.md`
  - `ENVIRONMENT.md`
  - `RUNBOOK.md`
  - `CHECKLIST_PRE_GO_LIVE.md`
- Scripts operativos para despliegue:
  - `deploy/hostinger/scripts/preflight.sh`
  - `deploy/hostinger/scripts/deploy.sh`
  - `deploy/hostinger/scripts/update.sh`
- Reglas de exclusión base añadidas:
  - `.gitignore` (raíz)
  - `platform/.dockerignore`

## 3. Archivos modificados
- `platform/apps/api/src/main.ts`
- `platform/apps/api/.env.example`
- `platform/apps/web/*.js`
- `platform/apps/web/*.html`

## 4. Archivos creados
- `.gitignore`
- `platform/.dockerignore`
- `platform/apps/api/Dockerfile`
- `platform/workers/security_worker/Dockerfile`
- `platform/apps/web/Dockerfile`
- `platform/apps/web/nginx.conf`
- `platform/apps/web/runtime-config.js`
- `deploy/hostinger/docker-compose.hostinger.yml`
- `deploy/hostinger/.env.hostinger.example`
- `deploy/hostinger/.env.api.example`
- `deploy/hostinger/.env.worker.example`
- `DEPLOY_HOSTINGER.md`
- `ENVIRONMENT.md`
- `RUNBOOK.md`

## 5. Validaciones ejecutadas
- Revisión de referencias frontend para confirmar uso de `window.NIMBUS_API_BASE`.
- Revisión de configuración compose y Dockerfiles.

## 6. Riesgos pendientes
- Falta validar build completo Docker end-to-end en entorno Hostinger real.
- Para `gdpr_web`, Playwright puede requerir instalación adicional de dependencias del navegador en producción.

## 7. Próximo paso recomendado
Inicializar git local, push al remoto `git@github.com:dbartolome/herramientas.git`, y ejecutar despliegue con la guía `DEPLOY_HOSTINGER.md`.
