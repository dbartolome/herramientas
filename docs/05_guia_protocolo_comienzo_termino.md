# 05 - Guía de Protocolo `/comienzo` y `/termino`

## Objetivo
Estandarizar el ciclo de trabajo de cada sesión para reducir pérdida de contexto y mejorar trazabilidad técnica.

## Uso recomendado

### Inicio de sesión
1. Escribir `/comienzo`.
2. Definir objetivo del bloque actual.
3. Revisar plan corto y bloqueos.
4. Ejecutar cambios en lotes pequeños con validación continua.

### Cierre de sesión
1. Escribir `/termino`.
2. Generar resumen técnico final.
3. Registrar validaciones y riesgos.
4. Actualizar archivo de sesión en `docs/`.

## Criterios de control de contexto
- Si el contexto crece, resumir decisiones y mantener solo lo operativo.
- Si la sesión se vuelve extensa, preparar handoff y continuar en sesión limpia.

## Convención de archivos de sesión
- `docs/NN_nombre_sesion.md`
- `NN` incremental.
- Debe incluir: objetivo, cambios, validaciones, riesgos y próximos pasos.

