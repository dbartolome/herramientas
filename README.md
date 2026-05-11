# panel_herramientas

Proyecto modular para una plataforma de auditoría técnica de seguridad y cumplimiento, con frontend por herramienta, API de orquestación y worker especializado de ejecución.

## 1. Radiografía completa del proyecto

## 1.1 Objetivo funcional
La plataforma permite ejecutar escaneos técnicos sobre dominios, correos y webs, devolviendo resultados normalizados, evidencias y recomendaciones accionables.

Herramientas actuales:
- Seguridad del correo electrónico (`email_security`)
- Consulta de vulneración de correo (`email_breach`)
- Test de velocidad (`speed_test`)
- Estado RGPD web (`gdpr_web`)
- Seguridad del dominio (`domain_security`)
- Seguridad de tu página web (`web_security`)

## 1.2 Arquitectura actual
Capas principales:
- `platform/apps/web`: frontend estático (catálogo + páginas por herramienta + panel admin de herramientas).
- `platform/apps/api`: API NestJS (TypeScript) para health, scans y administración de configuración de herramientas.
- `platform/workers/security_worker`: worker Python que consume cola Redis y ejecuta handlers por tipo de escaneo.
- `platform/packages/contracts`: contratos compartidos.
- `platform/infra`: Docker Compose (PostgreSQL + Redis).

Patrón de ejecución:
1. Frontend o cliente crea scan vía `POST /api/scans`.
2. API valida y encola job en Redis.
3. Worker consume job y ejecuta handler específico.
4. Worker persiste resultado del scan en Redis.
5. Frontend consulta `GET /api/scans/:id` por polling.

## 1.3 Estado técnico real (hoy)
- API operativa en `http://localhost:3000`.
- Frontend operativo en `http://localhost:8090`.
- Redis/Postgres por Docker Compose en `platform/infra`.
- Worker funcional con `REDIS_PORT=6380`.

Estado por herramienta:
- `domain_security`: funcional.
- `gdpr_web`: funcional y con reporte enriquecido.
- `email_security`: funcional.
- `web_security`: funcional (nivel actual del worker).
- `email_breach`: requiere `HIBP_API_KEY` para datos reales.
- `speed_test`: requiere cuota o `PAGESPEED_API_KEY` para evitar `429`.

## 1.4 Backend de administración incorporado
Se añadió módulo de administración de herramientas:
- `GET /api/admin/tools`
- `GET /api/admin/tools/:type`
- `PUT /api/admin/tools/:type`

Capacidades:
- Activar/desactivar herramientas (`enabled`).
- Definir `displayName`, `description`.
- Definir `defaultParams`, `timeoutMs`, `maxAssetLength`.
- Aplicar configuración al crear scans (bloqueo si está deshabilitada y merge de params por defecto).

## 1.5 Estructura de carpetas
```text
panel_herramientas/
├─ README.md
├─ AGENTS.md
├─ docs/
├─ skills/
└─ platform/
   ├─ apps/
   │  ├─ api/
   │  └─ web/
   ├─ workers/
   │  └─ security_worker/
   ├─ infra/
   └─ packages/
```

## 1.6 Riesgos y deuda técnica prioritaria
- Falta autenticación/autorización para endpoints admin.
- Persistencia de scans/config en Redis (sin modelo relacional final).
- Falta trazabilidad formal por tenant/usuario/role.
- Dependencia de APIs externas (HIBP/PageSpeed) sin manejo de secretos centralizado.
- Falta cobertura de tests automatizados por módulo crítico.

## 1.7 Hoja de ruta recomendada
1. Seguridad base:
- Proteger `/api/admin/*` con JWT + roles.
- Auditoría de cambios administrativos.
- Gestión de secretos (no en `.env` plano en producción).

2. Plataforma de datos:
- Migrar entidad de scans/config a PostgreSQL.
- Versionado de configuración por herramienta.

3. Calidad y fiabilidad:
- Tests unitarios y e2e en API + worker.
- Estrategia de retries, timeouts y circuit breakers por herramienta externa.

4. Escalabilidad modular:
- Registrar nuevas herramientas mediante contrato común.
- Plantilla estándar para añadir handler backend + página frontend + checks.

## 2. Arranque rápido local
Infra:
```bash
cd platform/infra
docker compose up -d
```

API:
```bash
cd platform
npm install
npm run dev:api
```

Worker:
```bash
cd platform/workers/security_worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

Frontend:
```bash
cd platform/apps/web
python3 -m http.server 8090
```

## 3. Convenciones de calidad (resumen)
- Nombres claros y consistentes por dominio.
- Funciones pequeñas, enfocadas y testeables.
- Comentario breve solo cuando aporte contexto no obvio.
- Cada función nueva debe documentar objetivo en 1 línea (docstring/JSDoc breve según lenguaje).
- Cada sesión de trabajo debe cerrar con documento en `docs/`.

## 4. Documentación por sesión
Toda sesión debe generar/actualizar:
- `docs/NN_seccion.md` (NN incremental).
- Contenido mínimo: objetivo, cambios, archivos tocados, validaciones, riesgos, próximos pasos.

