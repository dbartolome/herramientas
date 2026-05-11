# Variables de entorno

## `deploy/hostinger/.env`
- `POSTGRES_DB`: nombre de base de datos.
- `POSTGRES_USER`: usuario de PostgreSQL.
- `POSTGRES_PASSWORD`: contraseña de PostgreSQL.

## `deploy/hostinger/.env.api`
- `PORT`: puerto interno API (`3000`).
- `REDIS_HOST`: host Redis (`redis` en compose).
- `REDIS_PORT`: puerto Redis (`6379`).
- `SCANS_QUEUE_NAME`: nombre de cola.
- `ADMIN_TOKEN`: token base admin (cambiar).
- `ADMIN_PASSWORD`: password de login admin (cambiar).
- `ADMIN_SESSION_TTL_SEC`: TTL sesión admin.
- `ADMIN_LOGIN_MAX_ATTEMPTS`: intentos máximos login admin.
- `ADMIN_LOGIN_WINDOW_SEC`: ventana de intentos.
- `ADMIN_LOGIN_BLOCK_SEC`: bloqueo temporal tras exceder intentos.
- `ADMIN_AUDIT_MAX_ITEMS`: límite de auditoría.
- `USER_SESSION_TTL_SEC`: TTL sesión usuario.
- `ENABLE_SWAGGER`: `true/false` (en prod recomendado `false`).
- `CORS_ORIGINS`: lista de orígenes separados por coma.

## `deploy/hostinger/.env.worker`
- `REDIS_HOST`: host Redis.
- `REDIS_PORT`: puerto Redis.
- `QUEUE_NAME`: cola a consumir.
- `HIBP_API_KEY`: clave HaveIBeenPwned (opcional).
- `PAGESPEED_API_KEY`: clave Google PageSpeed (opcional).
