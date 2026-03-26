@echo off

REM ── Auto-elevate to Administrator ──────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

cd /d "%~dp0"

echo.
echo ======================================================
echo   Card Reader Service - NET Energy ERP
echo   Installing as Windows Service...
echo ======================================================
echo.

REM ── Check Node.js ──────────────────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Install Node.js 18+ from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

REM ── Enable Windows Smart Card Service ──────────────────────────────────────
sc query SCardSvr | findstr "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    sc config SCardSvr start= auto >nul 2>&1
    net start SCardSvr >nul 2>&1
    echo [OK] Smart Card Service enabled.
) else (
    echo [OK] Smart Card Service is running.
)

REM ── Install npm packages ───────────────────────────────────────────────────
echo.
echo [Step 2/3] Installing packages...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed.
    echo If the error mentions "Visual C++ Build Tools", run this in Admin PowerShell:
    echo     npm install --global windows-build-tools
    echo Then run install.bat again.
    echo.
    pause
    exit /b 1
)
echo [OK] Packages installed.

REM ── Install as Windows Service ─────────────────────────────────────────────
echo.
echo [Step 3/3] Registering Windows service...
node install-service.js
if %errorlevel% neq 0 (
    echo [WARN] Service registration had issues. See above for details.
)

echo.
echo ======================================================
echo   Done!
echo.
echo   - Service starts automatically with Windows.
echo   - Runs silently in the background (no window needed).
echo   - To remove: run uninstall.bat
echo ======================================================
echo.
pause
