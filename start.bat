@echo off
title Blood Donor Finder
color 0C

echo.
echo  ==========================================
echo   Blood Donor Finder - Starting Up
echo  ==========================================
echo.

REM ── Check Node is installed ───────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

REM ── Resolve project root ──────────────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "SERVER=%ROOT%\server"
set "CLIENT=%ROOT%\client"

echo  Project root : %ROOT%
echo.

REM ── Verify folders exist ──────────────────────────────────────────────────
if not exist "%SERVER%\server.js" (
    echo  [ERROR] server\server.js not found at: %SERVER%
    pause
    exit /b 1
)
if not exist "%CLIENT%\package.json" (
    echo  [ERROR] client\package.json not found at: %CLIENT%
    pause
    exit /b 1
)

REM ── Check .env exists ─────────────────────────────────────────────────────
if not exist "%SERVER%\.env" (
    echo  [WARNING] server\.env not found - server may crash without secrets!
    echo.
)

REM ── Install deps if node_modules missing ──────────────────────────────────
if not exist "%SERVER%\node_modules" (
    echo  [INFO] Installing server dependencies...
    cd /d "%SERVER%"
    call npm install
    echo.
)
if not exist "%CLIENT%\node_modules" (
    echo  [INFO] Installing client dependencies...
    cd /d "%CLIENT%"
    call npm install
    echo.
)

REM ── Return to root ────────────────────────────────────────────────────────
cd /d "%ROOT%"

REM ── Launch Backend ─────────────────────────────────────────────────────────
echo  [1/2] Starting Backend API  ->  http://localhost:5000 ...
start "BDF - Backend" cmd /k "color 0A & title BDF - Backend & cd /d %SERVER% & npm run dev"

REM ── Wait for MongoDB connection ────────────────────────────────────────────
echo  [...] Waiting for backend to connect to MongoDB...
timeout /t 4 /nobreak >nul

REM ── Launch Frontend ────────────────────────────────────────────────────────
echo  [2/2] Starting Frontend     ->  http://localhost:5173 ...
start "BDF - Frontend" cmd /k "color 09 & title BDF - Frontend & cd /d %CLIENT% & npm run dev"

REM ── Open browser after servers come up ─────────────────────────────────────
timeout /t 5 /nobreak >nul

echo.
echo  ==========================================
echo   Both servers are running!
echo.
echo   PC Browser  ->  http://localhost:5173
echo   API Health  ->  http://localhost:5000/api/health
echo.
echo   Phone (WiFi)->  http://192.168.31.144:5173
echo  ==========================================
echo.
echo  Press any key to open the app in your browser...
echo  (Close the individual server windows to stop)
pause >nul
start http://localhost:5173
