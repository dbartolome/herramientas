# 01 - Análisis del Proyecto

## Resumen
`panel_herramientas` es una plataforma modular de escaneos de seguridad y cumplimiento con separación clara entre UI, orquestación API y ejecución técnica en worker.

## Arquitectura
- Frontend estático por herramienta: `platform/apps/web`
- API de orquestación y administración: `platform/apps/api`
- Worker de ejecución por tipo de escaneo: `platform/workers/security_worker`
- Infra base: Redis + PostgreSQL en `platform/infra`

## Flujo operativo
1. Cliente solicita scan.
2. API valida y encola.
3. Worker procesa por handler.
4. Resultado persistido en Redis.
5. Frontend consulta estado y reporte.

## Fortalezas
- Diseño modular por herramienta.
- Integración admin-tools para gobierno operativo.
- Capacidad de ampliar catálogo sin rediseño completo.

## Brechas actuales
- Seguridad de endpoints admin pendiente (auth/rbac).
- Persistencia final de dominio aún no migrada a PostgreSQL.
- Dependencias externas con necesidad de gestión robusta de cuotas y secretos.

