# 13. Sesion arranque Windows para equipo

## 1. Objetivo de la sesión
Preparar un arranque simple para compañeros de Windows, sin pasos manuales complejos, desde la raíz del repositorio.

## 2. Cambios implementados
- Se creó `arrancar_windows.bat` en la raíz del proyecto.
  - Verifica Docker instalado.
  - Verifica Docker Desktop en ejecución.
  - Crea `.env`, `.env.api` y `.env.worker` desde sus ejemplos si faltan.
  - Ejecuta `docker compose up -d --build`.
  - Muestra estado de servicios y URLs de acceso.
  - Pregunta opcional para abrir navegador en `http://localhost:8080`.
- Se creó `parar_windows.bat` para detener servicios con `docker compose down`.
- Se actualizó `README.md` con sección de uso para Windows.

## 3. Archivos modificados
- `arrancar_windows.bat`
- `parar_windows.bat`
- `README.md`

## 4. Validaciones ejecutadas
- Revisión de scripts generados.
- Revisión de documentación actualizada en `README.md`.

## 5. Riesgos pendientes
- En equipos con políticas corporativas puede estar bloqueada la ejecución de `.bat`.
- Si Docker Desktop no está correctamente configurado con WSL2, el script no podrá levantar contenedores.

## 6. Próximo paso recomendado
Probar en un equipo Windows real y, si procede, añadir un script PowerShell equivalente para entornos que prefieran `.ps1`.
