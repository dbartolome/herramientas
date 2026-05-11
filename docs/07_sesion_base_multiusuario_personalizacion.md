# 07 - Sesión Base Multiusuario + Personalización

## Objetivo
Crear base funcional para usuarios/roles, historial privado de análisis y personalización global/usuario.

## Backend implementado

### Autenticación de usuario
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me/preferences`

### Gestión admin de usuarios/roles
- `GET /api/auth/admin/users`
- `PUT /api/auth/admin/users/:userId`

### Configuración global/personalización
- `GET /api/settings/public`
- `GET /api/me/settings`
- `PUT /api/me/settings`
- `GET /api/admin/settings` (protegido)
- `PUT /api/admin/settings` (protegido)

### Historial de análisis por usuario
- `POST /api/scans` ahora asocia `ownerUserId` cuando hay sesión de usuario.
- `GET /api/scans/me/history` devuelve históricos del usuario autenticado.

## Frontend admin mejorado
- `admin-tools.html/js` incluye sección de personalización global:
  - marca
  - tema por defecto (light/dark/system)
  - color principal
  - permitir/bloquear análisis anónimos

## Validación realizada
- Registro/login de usuario funcionando.
- Scan autenticado crea `ownerUserId` y aparece en historial privado.
- Admin lista usuarios y actualiza rol/plan.
- Admin actualiza personalización global.
- Usuario actualiza preferencia de tema.

## Riesgos/pendiente
- Persistencia actual en Redis (no PostgreSQL relacional aún).
- Faltan pantallas UI completas para gestión de usuarios y auditoría.
- Falta separar plan abierto vs plan básico con más reglas de negocio/facturación.

## Próximo paso recomendado
1. Construir en admin UI dos secciones nuevas:
   - Gestión de usuarios/roles
   - Auditoría admin
2. Forzar en frontend catálogo la personalización pública (`/settings/public`) y tema por usuario (`/auth/me` + prefs).

