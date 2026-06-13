@echo off
REM Doble-clic aqui: abre un dialogo para elegir carpeta y sube TODO a Supabase.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0subir-carpeta.ps1"
pause
