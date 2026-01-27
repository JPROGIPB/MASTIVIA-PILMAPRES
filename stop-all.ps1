# Stop All MooCare Services Script

Write-Host "========================================" -ForegroundColor Red
Write-Host "  Stopping All Services" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Stop all background jobs
$jobs = Get-Job
if ($jobs) {
    Write-Host "Stopping background jobs..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Host "All background jobs stopped." -ForegroundColor Green
} else {
    Write-Host "No background jobs found." -ForegroundColor Yellow
}

# Stop any Python processes (server.py)
Write-Host "Stopping Python server processes..." -ForegroundColor Yellow
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.py*" }
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "Python server stopped." -ForegroundColor Green
} else {
    Write-Host "No Python server process found." -ForegroundColor Yellow
}

# Stop Node processes (npm/vite)
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "Node.js processes stopped." -ForegroundColor Green
} else {
    Write-Host "No Node.js process found." -ForegroundColor Yellow
}

# Stop Ngrok
Write-Host "Stopping Ngrok..." -ForegroundColor Yellow
$ngrokProcesses = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    $ngrokProcesses | Stop-Process -Force
    Write-Host "Ngrok stopped." -ForegroundColor Green
} else {
    Write-Host "No Ngrok process found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
