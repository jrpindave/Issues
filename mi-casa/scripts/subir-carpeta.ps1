# ============================================================
#  Mi Casa - Sube el IFC de una carpeta a Supabase (como casa.ifc).
#  Pega tu service_role key (Supabase -> Settings -> API):
$Key        = "TU_SERVICE_ROLE_KEY"
$ProjectRef = "wetwdokwnstjidoceoib"
$Bucket     = "ifc"
# ============================================================

if ($Key -eq "TU_SERVICE_ROLE_KEY") {
  Write-Host "Falta pegar tu service_role key en este .ps1 (variable Key)." -ForegroundColor Yellow
  return
}

Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = "Elige la carpeta que contiene el IFC"
if ($dlg.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { Write-Host "Cancelado."; return }
$folder = $dlg.SelectedPath

# Solo archivos .ifc (el mas reciente si hay varios).
$ifc = Get-ChildItem -File -LiteralPath $folder -Filter *.ifc |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $ifc) { Write-Host "No hay ningun .ifc en esa carpeta." -ForegroundColor Yellow; return }

Write-Host ("Subiendo {0}  ->  {1}/casa.ifc ..." -f $ifc.Name, $Bucket)
$uri = "https://$ProjectRef.supabase.co/storage/v1/object/$Bucket/casa.ifc"
$headers = @{ "Authorization" = "Bearer $Key"; "x-upsert" = "true" }
try {
  Invoke-RestMethod -Uri $uri -Method Post -Headers $headers `
    -ContentType "application/octet-stream" -InFile $ifc.FullName | Out-Null
  Write-Host "OK. Recarga la app (issues-eight.vercel.app)." -ForegroundColor Green
} catch {
  $msg = $_.ErrorDetails.Message; if (-not $msg) { $msg = $_.Exception.Message }
  Write-Host ("ERROR: {0}" -f $msg) -ForegroundColor Red
  Write-Host "Revisa: (1) el bucket 'ifc' existe y es PUBLICO; (2) pegaste la service_role key (no la anon)." -ForegroundColor Yellow
}
