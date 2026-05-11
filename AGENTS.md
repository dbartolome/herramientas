# AGENTS.md

Normas operativas para cualquier agente/IA que trabaje en este repositorio.

## 1. Principios de trabajo
- Mantener arquitectura modular y extensible.
- Priorizar seguridad, trazabilidad y mantenibilidad.
- Evitar deuda técnica silenciosa: si algo no se implementa, documentarlo.
- No romper flujos existentes sin plan de migración.

## 2. Reglas de ingeniería por lenguaje

## 2.1 TypeScript / NestJS
- Activar tipado estricto y evitar `any` salvo justificación explícita.
- DTOs con validación (`class-validator`) para toda entrada pública.
- Servicios con responsabilidad única.
- Controladores delgados; lógica en servicios.
- Errores con excepciones HTTP explícitas y mensajes accionables.

## 2.2 Python (worker)
- Tipado estático cuando sea viable.
- Funciones puras para lógica de análisis; I/O separado.
- Manejar timeouts, retries y errores externos de forma defensiva.
- Evitar bloqueos largos sin control de cancelación/timeout.

## 2.3 Frontend (JS/CSS/HTML)
- Una página por herramienta (ya definido por producto).
- Evitar lógica duplicada; extraer utilidades compartidas.
- Estados UI explícitos: `queued`, `running`, `completed`, `failed`.
- Mantener responsive real (desktop/tablet/mobile).

## 3. Reglas de nombrado y documentación de funciones
- Nombres descriptivos por intención de negocio.
- Cada función nueva debe incluir descripción breve:
  - TS/JS: bloque JSDoc corto sobre qué hace.
  - Python: docstring breve sobre propósito y retorno.
- No añadir comentarios obvios; comentar decisiones, no sintaxis.

## 4. Reglas de cambios y sesiones
- Antes de editar, leer contexto del módulo afectado.
- Después de editar, validar con build/test/comprobación mínima ejecutable.
- Al cerrar sesión, actualizar documentación en `docs/` con formato estándar.

Plantilla mínima por sesión en `docs/`:
1. Objetivo de la sesión.
2. Cambios implementados.
3. Archivos modificados.
4. Validaciones ejecutadas.
5. Riesgos pendientes.
6. Próximo paso recomendado.

## 5. Reglas de seguridad
- No exponer secretos en código, commits o documentación.
- Proteger endpoints de administración (`/api/admin/*`) con autenticación y roles antes de producción.
- Registrar cambios administrativos relevantes (auditoría).

## 6. Rendimiento y optimización
- Optimizar por defecto para latencia y claridad.
- Evitar sobreingeniería prematura.
- En cada feature nueva, explicitar tradeoff: coste, complejidad y beneficio.

## 7. Flujo para nuevas herramientas (modular)
Para añadir una herramienta nueva, crear:
- Tipo en contratos y enum de scans.
- Handler en worker.
- Página frontend dedicada.
- Configuración administrable en `admin-tools`.
- Documentación de sección en `docs/`.

## 8. Política de calidad mínima para merge
- Build del módulo afectado en verde.
- Prueba funcional básica del flujo principal.
- Documentación de sesión actualizada en `docs/`.
- Sin cambios no explicados.

