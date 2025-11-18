<#
  start-dev.ps1
  Abre duas janelas do PowerShell e inicia backend e frontend em cada uma.
  Uso: executar em PowerShell com permissões de execução
    powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

Write-Host "Abrindo backend em nova janela do PowerShell..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$backendPath`"; npm run dev"

Start-Sleep -Seconds 1

Write-Host "Abrindo frontend em nova janela do PowerShell..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$frontendPath`"; npm run dev"

Write-Host "Ambos os terminais foram abertos. Verifique as janelas para logs." -ForegroundColor Green
