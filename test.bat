@echo off
cd /d "%~dp0"

REM ── 1. Check Node is installed ────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Download it from https://nodejs.org
    pause
    exit /b 1
)

REM ── 2. Install dependencies if node_modules is missing ───────────────────
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo.
)

REM ── 3. Run extraction if manual data files are missing ───────────────────
if not exist "lib\manual-content.txt" (
    echo Extracting manual content ^(first run only^)...
    node scripts\extract-manual.mjs
    if errorlevel 1 (
        echo ERROR: Manual extraction failed.
        pause
        exit /b 1
    )
    echo.
)

REM ── 4. Kill any process already holding port 3000 ────────────────────────
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM ── 5. Start the dev server ───────────────────────────────────────────────
echo Starting dev server...
start "Vulcan Dev Server" cmd /k "cd /d "%~dp0" && node_modules\.bin\next dev"

REM ── 6. Wait until port 3000 is accepting connections ─────────────────────
:wait
timeout /t 1 /nobreak >nul
curl -s --max-time 1 http://localhost:3000 >nul 2>&1
if errorlevel 1 goto wait

REM ── 7. Open browser ──────────────────────────────────────────────────────
echo Server ready. Opening browser...
start http://localhost:3000
