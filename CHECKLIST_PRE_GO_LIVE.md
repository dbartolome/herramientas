# Checklist Pre Go-Live

## Seguridad
- `POSTGRES_PASSWORD` cambiado (no valor por defecto).
- `ADMIN_TOKEN` y `ADMIN_PASSWORD` robustos y no compartidos.
- `ENABLE_SWAGGER=false` en producción.
- `CORS_ORIGINS` limitado a dominio(s) reales.
- HTTPS activo y redirección HTTP->HTTPS.
- Backups de PostgreSQL verificados con restore de prueba.

## Operación
- `docker compose ps` sin servicios en estado `unhealthy` o `restarting`.
- `GET /api/health` responde `ok`.
- Worker procesa al menos un scan de prueba end-to-end.
- Logs sin errores críticos repetitivos (web/api/worker).

## Producto
- Home carga y navega a todas las herramientas.
- Login de usuario funciona y guarda histórico.
- Panel admin funciona (login, settings, tools, users, audit).
- Tema claro/oscuro/sistema visible y funcional.

## Rendimiento mínimo
- TTFB home aceptable en red real.
- Tiempo medio de scan razonable por herramienta base.
- Sin bloqueos UI durante polling de resultados.

## Gobernanza
- `docs/` actualizado con la sesión previa al release.
- Release tag creado en git.
- Procedimiento de rollback probado.
