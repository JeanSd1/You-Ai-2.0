@echo off
REM YouAi - Setup Script para Windows PowerShell

echo.
echo ============================================
echo    🚀 YouAi - Setup Inicial
echo ============================================
echo.

REM Verificar Node.js
echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado! Baixe em: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

echo.
echo 📦 Instalando dependências do Backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências do backend
    pause
    exit /b 1
)
echo ✅ Backend configurado

echo.
echo 📦 Instalando dependências do Frontend...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências do frontend
    pause
    exit /b 1
)
echo ✅ Frontend configurado

cd ..

echo.
echo ✅ Setup completo!
echo.
echo 📝 Próximos passos:
echo.
echo 1️⃣  Configure o MongoDB Atlas:
echo    - Acesse: https://www.mongodb.com/cloud/atlas
echo    - Crie um cluster gratuito
echo    - Copie a string de conexão
echo.
echo 2️⃣  Configure as variáveis de ambiente:
echo    - backend\.env (adicione MONGODB_URI e JWT_SECRET)
echo    - frontend\.env (já vem configurado)
echo.
echo 3️⃣  Inicie o Backend:
echo    - cd backend
echo    - npm start
echo.
echo 4️⃣  Inicie o Frontend (em outro terminal):
echo    - cd frontend
echo    - npm run dev
echo.
echo 5️⃣  Acesse: http://localhost:5173
echo.
echo ============================================
echo.

pause
