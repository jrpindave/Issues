# ============================================================
#  Mi Casa - Sube el IFC de una carpeta a Supabase (como casa.ifc).
#  Pega tu service_role key (Supabase -> Settings -> API):
$Key        = "TU_SERVICE_ROLE_KEY"
$ProjectRef = "wetwdokwnstjidoceoib"
$Bucket     = "ifc"
# Carpeta por defecto (si existe, se usa directo sin preguntar):
$DefaultFolder = "C:\Users\jirp_\OneDrive\JRP2\03. Obras\SAN PEDRO\SP296\Casa"
# ============================================================

if ($Key -eq "TU_SERVICE_ROLE_KEY") {
  Write-Host "Falta pegar tu service_role key en este .ps1 (variable Key)." -ForegroundColor Yellow
  return
}

if (Test-Path -LiteralPath $DefaultFolder) {
  $folder = $DefaultFolder
} else {
  Add-Type -AssemblyName System.Windows.Forms
  $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
  $dlg.Description = "Elige la carpeta que contiene el IFC"
  if ($dlg.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { Write-Host "Cancelado."; return }
  $folder = $dlg.SelectedPath
}

# Solo archivos .ifc (el mas reciente si hay varios).
$ifc = Get-ChildItem -File -LiteralPath $folder -Filter *.ifc |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $ifc) { Write-Host "No hay ningun .ifc en esa carpeta." -ForegroundColor Yellow; return }

$base = "https://$ProjectRef.supabase.co/storage/v1/object/$Bucket"
$headers = @{ "Authorization" = "Bearer $Key"; "x-upsert" = "true" }
try {
  # 1) Sube con su nombre original (conserva versiones para el selector de la app)
  $enc = [uri]::EscapeDataString($ifc.Name)
  Write-Host ("Subiendo {0}  ->  {1}/{0} ..." -f $ifc.Name, $Bucket)
  Invoke-RestMethod -Uri "$base/$enc" -Method Post -Headers $headers `
    -ContentType "application/octet-stream" -InFile $ifc.FullName | Out-Null
  # 2) Tambien como casa.ifc (la "ultima" por defecto)
  Invoke-RestMethod -Uri "$base/casa.ifc" -Method Post -Headers $headers `
    -ContentType "application/octet-stream" -InFile $ifc.FullName | Out-Null
  Write-Host "OK (subido como $($ifc.Name) y casa.ifc). Recarga la app." -ForegroundColor Green
} catch {
  $msg = $_.ErrorDetails.Message; if (-not $msg) { $msg = $_.Exception.Message }
  Write-Host ("ERROR: {0}" -f $msg) -ForegroundColor Red
  Write-Host "Revisa: (1) el bucket 'ifc' existe y es PUBLICO; (2) pegaste la service_role key (no la anon)." -ForegroundColor Yellow
}
