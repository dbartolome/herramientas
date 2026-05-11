# Arquitectura Objetivo

## Contexto

Nimbus Security Platform es una plataforma multi-herramienta orientada a seguridad y cumplimiento.
Cada escaneo es una ejecución auditable, reproducible y trazable.

## Componentes

- API (`apps/api`):
  - Expone endpoints REST para crear escaneos y consultar estado.
  - Gestiona autenticación/autorización (siguiente iteración).
  - Publica jobs en cola.
- Workers (`workers/security_worker`):
  - Procesan escaneos por tipo de herramienta.
  - Devuelven resultados normalizados.
- Contratos (`packages/contracts`):
  - Tipos compartidos de request/event/result.
- Infra (`infra/docker-compose.yml`):
  - Redis para cola.
  - PostgreSQL para persistencia (siguiente iteración, actualmente repo en memoria).

## Tipos de escaneo soportados

- `email_security`
- `email_breach`
- `speed_test`
- `gdpr_web`
- `domain_security`
- `web_security`

## Flujo

1. Cliente crea escaneo (`POST /api/scans`).
2. API valida input y registra ejecución `queued`.
3. API encola payload en Redis.
4. Worker consume, ejecuta handler por tipo y produce resultado.
5. API (siguiente iteración) persistirá resultado final y evidencias.

## Próximas decisiones técnicas

- Migrar repositorio en memoria a PostgreSQL + ORM.
- Añadir autenticación JWT/OIDC + RBAC.
- Persistir findings/evidencias con versionado.
- Implementar rate limiting y deduplicación de scans.
