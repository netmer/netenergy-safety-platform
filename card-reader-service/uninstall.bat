@echo off

REM ── Auto-elevate to Administrator ──────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

echo.
echo Stopping Card Reader Service...
sc stop CardReader-NETEnergy >nul 2>&1
timeout /t 2 /nobreak >nul

echo Removing Card Reader Service...
sc delete CardReader-NETEnergy >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Service removed.
) else (
    echo [INFO] Service not found or already removed.
)

REM ── Clean up daemon folder left by node-windows ────────────────────────────
if exist daemon (
    rmdir /s /q daemon >nul 2>&1
    echo [OK] Cleaned up service files.
)

echo.
echo Done. Windows will no longer auto-start the card reader service.
echo.
pause
