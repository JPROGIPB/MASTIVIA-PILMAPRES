# Auto Setup Script untuk MooCare System
# Jalankan script ini di laptop baru untuk setup otomatis

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MooCare System - Auto Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cek Python
Write-Host "[1/6] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found!" -ForegroundColor Red
    Write-Host "  → Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Cek Node.js
Write-Host "[2/6] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
    Write-Host "  ✓ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    Write-Host "  → Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Cek Ngrok
Write-Host "[3/6] Checking Ngrok..." -ForegroundColor Yellow
try {
    $ngrokVersion = ngrok version 2>&1
    Write-Host "  ✓ Ngrok installed" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Ngrok not found (optional)" -ForegroundColor Yellow
    Write-Host "  → Download from: https://ngrok.com/download" -ForegroundColor Gray
}

# Setup Python Virtual Environment
Write-Host "[4/6] Setting up Python Virtual Environment..." -ForegroundColor Yellow
if (!(Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Virtual environment already exists" -ForegroundColor Green
}

# Aktivasi venv
Write-Host "  → Activating virtual environment..." -ForegroundColor Gray
& .\.venv\Scripts\Activate.ps1

# Install Python Dependencies
Write-Host "[5/6] Installing Python Dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r requirements.txt
Write-Host "  ✓ Python packages installed" -ForegroundColor Green

# Install Node Dependencies
Write-Host "[6/6] Installing Node.js Dependencies..." -ForegroundColor Yellow
Set-Location MooCare
npm install
Set-Location ..
Write-Host "  ✓ Node packages installed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Cek Ngrok authtoken
Write-Host "Additional Setup Required:" -ForegroundColor Cyan
Write-Host ""
$ngrokConfigPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (Test-Path $ngrokConfigPath) {
    Write-Host "  ✓ Ngrok authtoken configured" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Ngrok authtoken NOT configured" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  To setup Ngrok:" -ForegroundColor White
    Write-Host "  1. Sign up: https://dashboard.ngrok.com/signup" -ForegroundColor Gray
    Write-Host "  2. Get token: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Gray
    Write-Host "  3. Run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. If using Ngrok, setup authtoken (see above)" -ForegroundColor White
Write-Host "  2. Run: .\start-all.ps1" -ForegroundColor White
Write-Host "  3. Access Web App: http://localhost:5173" -ForegroundColor White
Write-Host "  4. Access AI Server: http://localhost:5000" -ForegroundColor White
Write-Host "  5. Access Ngrok Dashboard: http://localhost:4040" -ForegroundColor White
Write-Host ""
Write-Host "To start the system now, run:" -ForegroundColor Yellow
Write-Host "  .\start-all.ps1" -ForegroundColor Green
Write-Host ""
