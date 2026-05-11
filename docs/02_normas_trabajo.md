# 02 - Normas de Trabajo y Desarrollo

## Objetivo
Definir estándares estables para desarrollo continuo en un proyecto modular con crecimiento frecuente.

## Normas clave
- Toda funcionalidad nueva debe documentarse en `docs/`.
- Cada herramienta debe tener página dedicada.
- Toda entrada pública backend debe validarse con DTO.
- Toda integración externa debe tener manejo de errores, timeout y recomendaciones.
- Toda sesión debe cerrar con trazabilidad técnica.

## Convención de comentarios y funciones
- Funciones con nombre por intención funcional.
- Descripción breve obligatoria por función nueva (JSDoc/docstring).
- Comentarios solo para decisiones no obvias.

## Cierre de sesión
Crear/actualizar un archivo `docs/NN_seccion.md` con:
- objetivo
- cambios
- validación
- riesgos
- próximo paso

