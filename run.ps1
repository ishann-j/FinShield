# FinGuard Sentinel - One-Command Launcher (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting FinGuard Sentinel AI Threat Detection Console" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; node src/main.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm.cmd run dev"

Write-Host "Backend:  http://localhost:5050" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Demo Logins: admin / analyst / officer (Password: Admin@123)" -ForegroundColor Yellow
