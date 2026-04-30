@echo off

REM Kill whatever process is holding port 3000 (the old dev server node process)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Start the dev server directly via next binary — no npm overhead
start "Vulcan Dev Server" cmd /k "cd /d "%~dp0" && node_modules\.bin\next dev"

REM Poll until port 3000 responds, then open browser immediately
:wait
timeout /t 1 /nobreak >nul
curl -s --max-time 1 http://localhost:3000 >nul 2>&1
if errorlevel 1 goto wait

start http://localhost:3000
