# panel_herramientas skill

## Purpose
Skill operativo para trabajar este proyecto modular con máxima eficiencia de contexto, documentación continua y control de calidad por sesión.

## Session commands
- `/comienzo`
- `/termino`

## Behavior
When `/comienzo` appears:
1. Emitir estado corto del proyecto (arquitectura, servicios, bloqueos).
2. Pedir o inferir objetivo de sesión.
3. Proponer plan de ejecución en pasos verificables.
4. Activar control de consumo de contexto.

When `/termino` appears:
1. Entregar resumen técnico final.
2. Listar validaciones realizadas.
3. Listar pendientes/riesgos.
4. Crear o actualizar archivo en `docs/` con trazabilidad de sesión.

## Context budget policy
- >= 50% de contexto estimado:
  - resumir hilo en 8-12 líneas
  - dejar solo decisiones y próximos pasos
  - preguntar si desea modo compacto
- >= 90% de contexto estimado:
  - generar handoff listo para nueva sesión
  - sugerir cambio de modelo o reinicio de sesión con contexto reducido

## Engineering policy
- Preservar modularidad por herramienta.
- Toda función nueva con descripción breve.
- Cambios con validación mínima ejecutada.
- No cerrar sesión sin entrada en `docs/`.

## Output contract
Para cada avance relevante, reportar:
1. Qué se cambió.
2. Archivos tocados.
3. Validación ejecutada.
4. Riesgo pendiente.

