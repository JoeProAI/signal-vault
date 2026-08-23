@echo off
cd /d "%~dp0"
start "Signal Vault" /min cmd /c "npm run dev"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5173/"
