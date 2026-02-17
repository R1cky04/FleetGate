# FleetGate Startup Script
Write-Host "🚗 Iniciando FleetGate..." -ForegroundColor Cyan

# Stop any existing processes
Stop-Process -Name electron, node -Force -ErrorAction SilentlyContinue 2>&1 | Out-Null
Start-Sleep 2
Write-Host "✓ Processos anteriores parados" -ForegroundColor Green

# Start Backend in background
Write-Host "✓ Iniciando Backend API..." -ForegroundColor Green
$backendPath = "$PSScriptRoot\backend"
Push-Location $backendPath

# Ensure dist and generated client are in sync before launching API
npm run build

Start-Job -ScriptBlock { 
    param($path)
    Set-Location $path
    node dist/src/main.js 
} -ArgumentList $backendPath | Out-Null
Pop-Location

# Wait for backend to start
Start-Sleep 4
Write-Host "✓ Backend iniciado em http://localhost:3000" -ForegroundColor Green

# Start Electron
Write-Host "✓ Abrindo Electron App..." -ForegroundColor Green
Push-Location "$PSScriptRoot\frontend"
npx electron .
Pop-Location
