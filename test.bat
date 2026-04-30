@echo off
REM Close previous dev server window if it exists
taskkill /fi "WINDOWTITLE eq Prox Challenge Dev Server" /f 2>nul
REM Kill any process using port 3000
netstat -ano | find ":3000" >nul && for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /pid %%a /f 2>nul
timeout /t 1 /nobreak >nul

REM Start fresh dev server in a named window
start "Prox Challenge Dev Server" cmd /k "cd /d "%~dp0" && npm run dev"

REM Wait for Next.js to be ready, then open browser
timeout /t 5 /nobreak >nul
start http://localhost:3000
