@echo off
REM Lanzador robusto: usa el .ps1 con el mismo nombre base que este .bat;
REM si no, el primer .ps1 que haya en esta carpeta.
setlocal
set "PS1=%~dpn0.ps1"
if not exist "%PS1%" (
  for %%F in ("%~dp0*.ps1") do set "PS1=%%~fF"
)
if not exist "%PS1%" (
  echo No se encontro ningun archivo .ps1 junto a este .bat.
  pause & exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
echo.
pause
