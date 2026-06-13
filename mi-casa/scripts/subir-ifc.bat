@echo off
REM ============================================================
REM  Mi Casa - Subir IFC a Supabase Storage (sobrescribe la ultima version)
REM  Uso:  subir-ifc.bat "C:\ruta\a\Casa.ifc"
REM ------------------------------------------------------------
REM  Rellena estos 3 valores (te los doy al crear el bucket):
set PROJECT_REF=wetwdokwnstjidoceoib
set BUCKET=ifc
set UPLOAD_KEY=TU_SERVICE_ROLE_O_KEY_DE_SUBIDA
REM  Nombre fijo del objeto que lee la app:
set OBJECT=casa.ifc
REM ============================================================

if "%~1"=="" (
  echo Arrastra el .ifc sobre este .bat, o:  subir-ifc.bat "ruta\Casa.ifc"
  pause & exit /b 1
)

echo Subiendo "%~1" -> %BUCKET%/%OBJECT% ...
curl -sS -X POST ^
  "https://%PROJECT_REF%.supabase.co/storage/v1/object/%BUCKET%/%OBJECT%" ^
  -H "Authorization: Bearer %UPLOAD_KEY%" ^
  -H "Content-Type: application/octet-stream" ^
  -H "x-upsert: true" ^
  --data-binary "@%~1"

echo.
echo Listo. La app cargara la nueva version al recargar.
echo URL publica: https://%PROJECT_REF%.supabase.co/storage/v1/object/public/%BUCKET%/%OBJECT%
pause
