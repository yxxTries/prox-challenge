@echo off
REM Close previous dev server window by title
taskkill /fi "WINDOWTITLE eq Vulcan Dev Server" /f 2>nul
timeout /t 1 /nobreak >nul

REM Start fresh dev server in a named window
start "Vulcan Dev Server" cmd /k "cd /d "%~dp0" && npm run dev"

REM Wait for Next.js to be ready, then open browser
timeout /t 5 /nobreak >nul
start http://localhost:3000
