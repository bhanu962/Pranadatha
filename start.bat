@echo off
title Blood Donor Finder

echo.
echo  ==========================================
echo   🩸  Blood Donor Finder — Starting Up
echo  ==========================================
echo.

REM ── Check Node is installed ───────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

REM ── Resolve project root (directory of this .bat file) ───────────────────
set "ROOT=%~dp0blood-donor-finder"
set "SERVER=%ROOT%\server"
set "CLIENT=%ROOT%\client"

REM ── Verify folders exist ──────────────────────────────────────────────────
if not exist "%SERVER%\server.js" (
    echo  [ERROR] server\server.js not found. Check your project structure.
    pause
    exit /b 1
)
if not exist "%CLIENT%\package.json" (
    echo  [ERROR] client\package.json not found. Check your project structure.
    pause
    exit /b 1
)

REM ── Install deps if node_modules missing ─────────────────────────────────
if not exist "%SERVER%\node_modules" (
    echo  [INFO] Installing server dependencies...
    pushd "%SERVER%"
    call npm install
    popd
)
if not exist "%CLIENT%\node_modules" (
    echo  [INFO] Installing client dependencies...
    pushd "%CLIENT%"
    call npm install
    popd
)

REM ── Launch Backend in a new window ────────────────────────────────────────
echo  [1/2] Starting Backend API on http://localhost:5000 ...
start "BDF - Backend (API)" cmd /k "cd /d "%SERVER%" && npm run dev"

REM ── Short delay to let backend connect to MongoDB first ──────────────────
timeout /t 3 /nobreak >nul

REM ── Launch Frontend in a new window ──────────────────────────────────────
echo  [2/2] Starting Frontend on http://localhost:5173 ...
start "BDF - Frontend (Vite)" cmd /k "cd /d "%CLIENT%" && npm run dev"

REM ── Give both servers a moment then open browser ─────────────────────────
timeout /t 5 /nobreak >nul
echo.
echo  ==========================================
echo   ✅  Both servers are running!
echo.
echo   On this PC:
echo   Frontend  →  http://localhost:5173
echo   Backend   →  http://localhost:5000/api/health
echo.
echo   On your phone (same WiFi):
echo   Frontend  →  http://192.168.31.144:5173
echo  ==========================================
echo.
echo  Close the individual server windows to stop.
echo  Press any key to open the app in your browser...
pause >nul
start http://localhost:5173
