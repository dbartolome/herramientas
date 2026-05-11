# 03 - Skill del Proyecto (Diseño)

## Objetivo del skill
Optimizar uso de contexto/tokens y mantener sesiones de trabajo largas con control operativo.

## Comandos de sesión
- `/comienzo`: activa protocolo de arranque de sesión.
- `/termino`: ejecuta protocolo de cierre y documentación.

## Protocolo `/comienzo`
1. Cargar contexto mínimo del proyecto.
2. Mostrar estado rápido: servicios, rama, cambios locales, bloqueos.
3. Proponer plan en bloques pequeños.
4. Activar modo de control de consumo de contexto.

## Protocolo `/termino`
1. Resumen de cambios reales.
2. Validaciones ejecutadas y estado.
3. Riesgos pendientes.
4. Actualizar `docs/` con archivo de sesión.

## Política de consumo de tokens
- Al superar 50% de contexto estimado:
  - resumir estado
  - colapsar historial en checklist
  - proponer limpiar contexto
- Al superar 90%:
  - generar handoff técnico
  - recomendar cambio de modelo o nueva sesión con contexto mínimo

## Recomendación de implementación
Crear skill local en `skills/panel_herramientas/SKILL.md` con checklist y plantilla de salida por fase.

