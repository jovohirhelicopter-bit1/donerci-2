@echo off
cd /d "%~dp0"
echo ===============================
echo       LAZZAT PUBLIC MODE
echo ===============================
start "Lazzat Server" cmd /k "npm start"
timeout /t 3 /nobreak >nul
set PORT=5050
if exist .lazzat-port set /p PORT=<.lazzat-port
echo Server port: %PORT%
echo.
echo HTTPS tunnel ochilmoqda...
call npx localtunnel --port %PORT%
pause
