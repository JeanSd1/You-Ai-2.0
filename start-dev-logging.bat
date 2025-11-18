@echo off
REM start-dev-logging.bat
REM Abre duas janelas e redireciona logs para arquivos em ./logs

SET ROOT=%~dp0
IF NOT EXIST "%ROOT%logs" mkdir "%ROOT%logs"

REM Backend: abre nova janela e inicia com redirecionamento de log
start "YouAi Backend" cmd /k "cd /d "%ROOT%backend" && echo Installing backend deps... && npm install > "%ROOT%logs\backend_install.log" 2>&1 && echo Starting backend... && npm run dev > "%ROOT%logs\backend.log" 2>&1"

REM Frontend: abre nova janela e inicia com redirecionamento de log
start "YouAi Frontend" cmd /k "cd /d "%ROOT%frontend" && echo Installing frontend deps... && npm install > "%ROOT%logs\frontend_install.log" 2>&1 && echo Starting frontend... && npm run dev > "%ROOT%logs\frontend.log" 2>&1"

echo Janelas abertas. Logs serão gravados em "%ROOT%logs".
echo Aguarde alguns segundos e verifique os arquivos de log.
pause
