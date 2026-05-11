# Plan de Implementación

## Fase 0 - Base (completada en este commit)

- Estructura de monorepo.
- API base NestJS con health y scans.
- Cola Redis integrada.
- Worker Python con handlers por tipo de escaneo.
- Contratos compartidos de dominio.
- Documentación de arquitectura.

## Fase 1 - Funcionalidad real por módulo

1. Seguridad de correo:
- SPF/DKIM/DMARC con `dnspython`.
- MTA-STS/TLS-RPT y scoring.

2. Breach de correo:
- Integración HIBP v3.
- Modo privacidad por hash.

3. Test de velocidad:
- Integración PageSpeed Insights API v5.
- Normalización de Core Web Vitals.

4. Estado RGPD web:
- Playwright para cookies before/after.
- Motor de reglas con evidencias.

5. Seguridad de dominio:
- DNSSEC, CAA, RDAP, TLS.

6. Seguridad web:
- Integración ZAP baseline.
- Integración Nuclei templates.

## Fase 2 - Plataforma productiva

- PostgreSQL para assets/scans/results.
- Auth + RBAC + auditoría.
- Observabilidad: logs estructurados, métricas y tracing.
- Gestión de secretos y egress control.
- Panel frontend sobre nueva API.

## Fase 3 - Fiabilidad enterprise

- Escaneos programados.
- Alertas por regresión de postura de seguridad.
- SLO/SLA operativos.
- Hardening y pentesting interno.
