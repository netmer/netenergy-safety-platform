@echo off
echo.
echo ======================================================
echo   Card Reader Service - NET Energy ERP
echo   Running on http://localhost:38080
echo   Press Ctrl+C to stop
echo ======================================================
echo.

if not exist "node_modules" (
    echo [ERROR] Not installed yet. Please run install.bat first.
    pause
    exit /b 1
)

node server.js
pause
