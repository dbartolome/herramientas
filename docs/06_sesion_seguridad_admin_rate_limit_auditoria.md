# 06 - Sesión Seguridad Admin: Rate Limit + Auditoría

## Objetivo
Fortalecer autenticación admin incorporando limitación de intentos de login, bloqueo temporal y trazabilidad de eventos administrativos.

## Cambios implementados
- Se añadió `AuditService` con persistencia en Redis (lista acotada).
- Se añadió endpoint protegido `GET /api/admin/audit`.
- Login admin ahora aplica controles por IP:
  - máximo intentos por ventana
  - bloqueo temporal tras superar umbral
- Se registran eventos de auditoría:
  - login exitoso
  - login fallido
  - logout de sesión
  - update de configuración de herramienta
- Se añadió utilidad de extracción de IP real de request.

## Archivos modificados/creados
- `platform/apps/api/src/modules/auth/audit.service.ts`
- `platform/apps/api/src/modules/auth/admin-audit.controller.ts`
- `platform/apps/api/src/modules/auth/request-ip.util.ts`
- `platform/apps/api/src/modules/auth/auth.module.ts`
- `platform/apps/api/src/modules/auth/auth.service.ts`
- `platform/apps/api/src/modules/auth/auth.controller.ts`
- `platform/apps/api/src/modules/admin-tools/admin-tools.controller.ts`
- `platform/apps/api/.env`
- `platform/apps/api/.env.example`

## Variables nuevas
- `ADMIN_LOGIN_MAX_ATTEMPTS`
- `ADMIN_LOGIN_WINDOW_SEC`
- `ADMIN_LOGIN_BLOCK_SEC`
- `ADMIN_AUDIT_MAX_ITEMS`

## Validaciones realizadas
- Build API correcto.
- Login correcto con password válida.
- Login fallido repetido devuelve `401` y pasa a `429` al superar umbral.
- Auditoría devuelve eventos recientes desde `/api/admin/audit`.

## Riesgos pendientes
- Falta endpoint de desbloqueo manual por IP para soporte.
- Falta exportación/retención a largo plazo de auditoría (actualmente Redis in-memory/volumen).

## Próximo paso
- Añadir desbloqueo administrativo controlado (`POST /api/admin/auth/unblock`).
- Exponer auditoría en UI admin con filtros por acción/fecha.

