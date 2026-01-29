# Script untuk membuat ZIP deployment yang siap pakai di komputer lain

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating Deployment Package" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Tentukan nama file zip
$zipName = "MASTIVIA-PILMAPRES-Deployment.zip"
$tempFolder = "MASTIVIA-PILMAPRES"

Write-Host "[1/5] Creating temporary folder..." -ForegroundColor Yellow
if (Test-Path $tempFolder) {
    Remove-Item -Recurse -Force $tempFolder
}
New-Item -ItemType Directory -Path $tempFolder | Out-Null

Write-Host "[2/5] Copying essential files..." -ForegroundColor Yellow

# List file dan folder yang HARUS di-copy
$essentialItems = @(
    "server.py",
    "requirements.txt",
    "ngrok.yaml",
    "setup.ps1",
    "start-all.ps1",
    "stop-all.ps1",
    "SETUP_GUIDE.md",
    "SETUP_CHECKLIST.md",
    "README.md",
    "model_mastitis_mobilenetv2.h5",
    "MooCare",
    "esp32cam.cpp",
    "esp8266.cpp",
    "upload_cow_data.py",
    "upload_100_cows.py"
)

foreach ($item in $essentialItems) {
    if (Test-Path $item) {
        Write-Host "  ✓ Copying $item" -ForegroundColor Green
        if (Test-Path $item -PathType Container) {
            Copy-Item -Path $item -Destination $tempFolder -Recurse -Force
        } else {
            Copy-Item -Path $item -Destination $tempFolder -Force
        }
    } else {
        Write-Host "  ⚠ MISSING: $item" -ForegroundColor Red
    }
}

Write-Host "[3/5] Cleaning unnecessary files..." -ForegroundColor Yellow

# Hapus folder yang tidak perlu
$excludeFolders = @(
    "$tempFolder\.venv",
    "$tempFolder\MooCare\node_modules",
    "$tempFolder\__pycache__",
    "$tempFolder\.git",
    "$tempFolder\Data kaggle mastitis"
)

foreach ($folder in $excludeFolders) {
    if (Test-Path $folder) {
        Write-Host "  ✓ Removing $folder" -ForegroundColor Gray
        Remove-Item -Recurse -Force $folder
    }
}

Write-Host "[4/5] Creating ZIP file..." -ForegroundColor Yellow
if (Test-Path $zipName) {
    Remove-Item -Force $zipName
}

Compress-Archive -Path $tempFolder -DestinationPath $zipName -CompressionLevel Optimal

Write-Host "[5/5] Cleanup..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $tempFolder

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Package Created Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "File: $zipName" -ForegroundColor Cyan
$zipSize = (Get-Item $zipName).Length / 1MB
Write-Host "Size: $($zipSize.ToString('0.00')) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Transfer file ini ke komputer lain, lalu:" -ForegroundColor Yellow
Write-Host "  1. Ekstrak ZIP" -ForegroundColor White
Write-Host "  2. Install Python 3.10 & Node.js 18+" -ForegroundColor White
Write-Host "  3. Jalankan: .\setup.ps1" -ForegroundColor White
Write-Host "  4. Jalankan: .\start-all.ps1" -ForegroundColor White
Write-Host ""

# Verifikasi file penting
Write-Host "Verifying critical files in ZIP..." -ForegroundColor Yellow
Expand-Archive -Path $zipName -DestinationPath "temp_verify" -Force
$criticalFiles = @(
    "temp_verify\MASTIVIA-PILMAPRES\model_mastitis_mobilenetv2.h5",
    "temp_verify\MASTIVIA-PILMAPRES\MooCare\mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json"
)

$allCriticalPresent = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ MISSING: $(Split-Path $file -Leaf)" -ForegroundColor Red
        $allCriticalPresent = $false
    }
}

Remove-Item -Recurse -Force "temp_verify"

if (!$allCriticalPresent) {
    Write-Host ""
    Write-Host "WARNING: Critical files missing!" -ForegroundColor Red
    Write-Host "System will not work without:" -ForegroundColor Yellow
    Write-Host "  - model_mastitis_mobilenetv2.h5 (AI model)" -ForegroundColor White
    Write-Host "  - Firebase credentials JSON file" -ForegroundColor White
}
