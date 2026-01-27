# Script untuk menjalankan AI Server, Web Dev Server, dan Ngrok sekaligus
# Pastikan semua dependencies sudah terinstall

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MooCare System Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Mendapatkan lokasi script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Fungsi untuk menjalankan command dalam background
function Start-BackgroundProcess {
    param (
        [string]$Name,
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$Color = "Green"
    )
    
    Write-Host "[START] $Name..." -ForegroundColor $Color
    
    $job = Start-Job -ScriptBlock {
        param($cmd, $dir)
        Set-Location $dir
        Invoke-Expression $cmd
    } -ArgumentList $Command, $WorkingDirectory
    
    return $job
}

Write-Host "1. Starting AI Server (Flask - Port 5000)..." -ForegroundColor Yellow
$aiJob = Start-BackgroundProcess -Name "AI Server" -Command "python server.py" -WorkingDirectory $scriptPath -Color "Green"
Start-Sleep -Seconds 3

Write-Host "2. Starting Web Development Server (Vite - Port 5173)..." -ForegroundColor Yellow
$webPath = Join-Path $scriptPath "MooCare"
$webJob = Start-BackgroundProcess -Name "Web Server" -Command "npm run dev" -WorkingDirectory $webPath -Color "Blue"
Start-Sleep -Seconds 5

Write-Host "3. Starting Ngrok Tunnels..." -ForegroundColor Yellow
$ngrokJob = Start-BackgroundProcess -Name "Ngrok" -Command "ngrok start --all --config ngrok.yaml" -WorkingDirectory $scriptPath -Color "Magenta"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Running:" -ForegroundColor Cyan
Write-Host "  - AI Server:  http://localhost:5000" -ForegroundColor White
Write-Host "  - Web Server: http://localhost:5173" -ForegroundColor White
Write-Host "  - Ngrok:      http://localhost:4040 (dashboard)" -ForegroundColor White
Write-Host ""
Write-Host "Job IDs:" -ForegroundColor Cyan
Write-Host "  - AI Server:  $($aiJob.Id)" -ForegroundColor Gray
Write-Host "  - Web Server: $($webJob.Id)" -ForegroundColor Gray
Write-Host "  - Ngrok:      $($ngrokJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  - View job output:    Get-Job | Receive-Job" -ForegroundColor White
Write-Host "  - Stop all services:  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White
Write-Host "  - Check job status:   Get-Job" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to return to terminal (services will continue running)" -ForegroundColor Green
Write-Host ""

# Monitor jobs - akan terus berjalan sampai user menekan Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if any job failed
        $jobs = Get-Job -Id $aiJob.Id, $webJob.Id, $ngrokJob.Id
        $failed = $jobs | Where-Object { $_.State -eq 'Failed' }
        
        if ($failed) {
            Write-Host ""
            Write-Host "WARNING: Some services failed!" -ForegroundColor Red
            foreach ($job in $failed) {
                Write-Host "  - $($job.Name) failed" -ForegroundColor Red
                Receive-Job -Job $job
            }
        }
    }
}
finally {
    Write-Host ""
    Write-Host "To stop all services later, run:" -ForegroundColor Yellow
    Write-Host "  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White
}
