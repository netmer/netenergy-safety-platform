@echo off

REM ── Auto-elevate to Administrator ──────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

cd /d "%~dp0"

echo.
echo Removing Card Reader Service...
echo.
node uninstall-service.js

echo.
echo Service has been removed. Windows will no longer auto-start it.
echo.
pause
