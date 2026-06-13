# ============================================================
#  Mi Casa - Subir una carpeta completa a Supabase Storage
#  Elige una carpeta y sube todos sus archivos (overwrite).
#  Si hay un .ifc, tambien se sube como "casa.ifc" (lo que lee la app).
# ------------------------------------------------------------
#  Rellena tu llave una sola vez (Supabase -> Settings -> API -> service_role):
$Key        = "TU_SERVICE_ROLE_KEY"
$ProjectRef = "wetwdokwnstjidoceoib"
$Bucket     = "ifc"
# ============================================================

if ($Key -eq "TU_SERVICE_ROLE_KEY") {
  Write-Host "Falta pegar tu service_role key en subir-carpeta.ps1 (variable `$Key)." -ForegroundColor Yellow
  exit 1
}

Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = "Elige la carpeta con tus archivos (IFC, etc.)"
if ($dlg.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { Write-Host "Cancelado."; exit }
$folder = $dlg.SelectedPath

$base = "https://$ProjectRef.supabase.co/storage/v1/object/$Bucket"
$headers = @{ "Authorization" = "Bearer $Key"; "x-upsert" = "true" }

$files = Get-ChildItem -File -Path $folder
if ($files.Count -eq 0) { Write-Host "La carpeta esta vacia."; exit }

foreach ($f in $files) {
  try {
    Write-Host ("Subiendo {0} ..." -f $f.Name)
    Invoke-RestMethod -Uri "$base/$($f.Name)" -Method Post -Headers $headers `
      -ContentType "application/octet-stream" -InFile $f.FullName | Out-Null
    if ($f.Extension -ieq ".ifc") {
      Invoke-RestMethod -Uri "$base/casa.ifc" -Method Post -Headers $headers `
        -ContentType "application/octet-stream" -InFile $f.FullName | Out-Null
      Write-Host "   -> tambien como casa.ifc (la app leera este)" -ForegroundColor Green
    }
  } catch {
    Write-Host ("   ERROR en {0}: {1}" -f $f.Name, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Listo. Recarga la app (issues-eight.vercel.app)." -ForegroundColor Green
