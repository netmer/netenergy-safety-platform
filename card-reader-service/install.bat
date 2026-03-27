@echo off
cd /d "%~dp0"

echo.
echo ==================================================
echo   Card Reader Service - NET Energy ERP
echo ==================================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo Download from: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

REM npm install
echo.
echo [1/2] Installing packages...
call npm install --omit=dev
if errorlevel 1 (
    echo [ERROR] npm install failed. See error above.
    pause
    exit /b 1
)
echo [OK] Packages installed.

REM Register as user-level Task Scheduler task (no admin required)
echo.
echo [2/2] Registering auto-start task...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-task.ps1" -Dir "%~dp0"
if errorlevel 1 (
    echo.
    echo [WARN] Auto-start registration failed - see message above.
    echo        The service will run now but may not auto-start after reboot.
    echo        Try running install.bat again, or contact IT Support.
    echo.
)

REM Start service now (hidden window)
echo.
echo Starting service now...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

echo.
echo ==================================================
echo   Done!
echo.
echo   Service starts automatically on Windows login.
echo   No administrator rights required.
echo   To remove: run uninstall.bat
echo ==================================================
echo.
pause
