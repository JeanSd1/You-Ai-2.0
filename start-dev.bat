@echo off
REM Inicia o script PowerShell que automatiza backend + frontend
cd /d %~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto-start.ps1"
pause