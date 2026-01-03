# AuthAdvance - Startup Script for Windows PowerShell
# This script starts both the backend and frontend servers

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   AuthAdvance - Starting All Services     " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get the script's directory (project root)
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if server node_modules exists
if (-not (Test-Path "$ProjectRoot\server\node_modules")) {
    Write-Host "[!] Installing server dependencies..." -ForegroundColor Yellow
    Set-Location "$ProjectRoot\server"
    npm install
}

# Check if client node_modules exists
if (-not (Test-Path "$ProjectRoot\client\node_modules")) {
    Write-Host "[!] Installing client dependencies..." -ForegroundColor Yellow
    Set-Location "$ProjectRoot\client"
    npm install
}

Write-Host ""
Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\server'; Write-Host 'Backend Server' -ForegroundColor Cyan; npm run dev"

Write-Host "[2/2] Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\client'; Write-Host 'Frontend Server' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Servers Starting...                      " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Two new PowerShell windows should have opened." -ForegroundColor Yellow
Write-Host "Close them to stop the servers." -ForegroundColor Yellow
Write-Host ""

# Wait a few seconds then try to open the browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"
