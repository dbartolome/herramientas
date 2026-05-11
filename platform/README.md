# Nimbus Security Platform

Plataforma de auditoría de seguridad modular para:
- Seguridad del correo electrónico
- Consulta de vulneración de correo
- Test de velocidad
- Estado RGPD web
- Seguridad del dominio
- Seguridad de la página web

## Arquitectura

- `apps/api`: API Gateway en NestJS (TypeScript)
- `workers/security_worker`: workers de escaneo en Python
- `packages/contracts`: contratos compartidos de dominio y tipos
- `infra`: docker compose (PostgreSQL + Redis)

## Estado actual

Implementado funcionalmente:
- Orquestación de escaneos por cola Redis.
- Persistencia de estado/resultados de scans en Redis.
- Módulos reales de worker:
  - `email_security`: SPF, DKIM (selector), DMARC, MX, MTA-STS, TLS-RPT.
  - `email_breach`: consulta HIBP v3 (requiere `HIBP_API_KEY`).
  - `speed_test`: Google PageSpeed Insights (opcional `PAGESPEED_API_KEY`).
  - `domain_security`: checks DNS básicos (NS/A/AAAA/CAA/TXT).
- Módulos en placeholder técnico: `gdpr_web`, `web_security`.

## Próximos pasos

1. Persistencia final en PostgreSQL y modelo multi-tenant.
2. Autenticación + RBAC + auditoría.
3. Integración real de `gdpr_web` y `web_security` (Playwright + ZAP/Nuclei).

## Arranque local

Ver `docs/run-local.md`.
