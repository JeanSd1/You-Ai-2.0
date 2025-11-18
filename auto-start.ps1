<#
  auto-start.ps1
  Automatiza:
   - procura um `.env` nas pastas pai para extrair `MONGO_URI`/`MONGODB_URI`
   - atualiza `backend/.env` com `MONGODB_URI`
   - mata processo que esteja usando a porta 3001 (se existir)
   - instala dependências (backend e frontend)
   - abre duas janelas do PowerShell e inicia `npm run dev` em backend e frontend

  Uso (na raiz do projeto `You-Ai-2.0`):
    powershell -ExecutionPolicy Bypass -File .\auto-start.ps1

  Observação: este script roda localmente e NÃO envia suas credenciais para ninguém.
#>

Set-StrictMode -Version Latest
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Iniciando auto-start a partir de: $root" -ForegroundColor Cyan

# Procurar .env em raiz e até 3 níveis acima
$envFile = $null
for ($i = 0; $i -le 3; $i++) {
  $tryPath = Resolve-Path -Path (Join-Path $root ('..' * $i + '\.env')) -ErrorAction SilentlyContinue
  if ($tryPath) { $envFile = $tryPath; break }
}

if (-not $envFile) {
  # fallback: procurar .env no root do repo
  $try = Join-Path $root '.env'
  if (Test-Path $try) { $envFile = $try }
}

if ($envFile) {
  Write-Host ".env encontrado em: $envFile" -ForegroundColor Green
  $lines = Get-Content $envFile -ErrorAction SilentlyContinue
  $mongoLine = $lines | Where-Object { $_ -match '^(MONGO_URI|MONGODB_URI)=' } | Select-Object -First 1
  if ($mongoLine) {
    $mongoUri = $mongoLine.Split('=',2)[1].Trim()
    if ($mongoUri -and $mongoUri -ne '') {
      # atualizar backend/.env
      $backendEnv = Join-Path $root 'backend\.env'
      if (-not (Test-Path $backendEnv)) {
        "MONGODB_URI=$mongoUri`nJWT_SECRET=uma_chave_super_forte_aqui`nPORT=3001`nNODE_ENV=development`nFRONTEND_URL=http://localhost:5173" | Out-File -Encoding UTF8 $backendEnv
        Write-Host "backend/.env criado com MONGODB_URI." -ForegroundColor Green
      } else {
        $bContent = Get-Content $backendEnv -Raw
        if ($bContent -match '^(MONGODB_URI|MONGO_URI)=') {
          $bContent = $bContent -replace '^(MONGODB_URI|MONGO_URI)=.*', "MONGODB_URI=$mongoUri"
        } else {
          $bContent += "`nMONGODB_URI=$mongoUri`n"
        }
        $bContent | Set-Content $backendEnv -Encoding UTF8
        Write-Host "backend/.env atualizado com MONGODB_URI a partir do .env encontrado." -ForegroundColor Green
      }
    } else { Write-Host "MONGO_URI vazio no .env encontrado." -ForegroundColor Yellow }
  } else { Write-Host "Nenhuma MONGO_URI/MONGODB_URI encontrada no .env." -ForegroundColor Yellow }
} else {
  Write-Host "Nenhum .env encontrado nos diretórios verificados. Você pode inserir a URI manualmente em backend/.env." -ForegroundColor Yellow
}

# Função para matar processo que usa a porta
function Kill-Port($port) {
  Try {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
      $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($pid in $pids) {
        if ($pid -and $pid -ne 0) {
          Write-Host "Matando processo PID $pid que usa a porta $port" -ForegroundColor Yellow
          Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
      }
      Start-Sleep -Milliseconds 500
    } else {
      # fallback com netstat
      $ns = netstat -ano | Select-String ":$port"
      if ($ns) {
        $pid = ($ns -split '\s+')[-1]
        if ($pid) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue; Write-Host "Matado PID $pid (netstat)." -ForegroundColor Yellow }
      }
    }
  } Catch {
    Write-Host "Falha ao tentar matar processo na porta $port: $_" -ForegroundColor Red
  }
}

# Tenta liberar a porta 3001
Kill-Port -port 3001

# Instalar dependências backend e frontend (silencioso quando possível)
if (Test-Path (Join-Path $root 'backend\package.json')) {
  Write-Host "Instalando dependências do backend..." -ForegroundColor Cyan
  Push-Location (Join-Path $root 'backend')
  npm install
  Pop-Location
}

if (Test-Path (Join-Path $root 'frontend\package.json')) {
  Write-Host "Instalando dependências do frontend..." -ForegroundColor Cyan
  Push-Location (Join-Path $root 'frontend')
  npm install
  Pop-Location
}

# Abrir backend e frontend em janelas separadas
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

Write-Host "Iniciando backend em nova janela..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$backendPath`"; npm run dev"
Start-Sleep -Seconds 1
Write-Host "Iniciando frontend em nova janela..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$frontendPath`"; npm run dev"

Write-Host "Pronto — verifique as novas janelas para logs do backend e frontend." -ForegroundColor Green
