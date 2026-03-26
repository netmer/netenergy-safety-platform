@echo off

REM ── Auto-elevate to Administrator ──────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

echo.
echo Removing Card Reader Service...
echo.

powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
    "$n='CardReader-NETEnergy';" ^
    "Stop-Service $n -Force -ErrorAction SilentlyContinue;" ^
    "Start-Sleep -Seconds 3;" ^
    "$r = sc.exe delete $n 2>&1;" ^
    "if ($LASTEXITCODE -eq 0) { Write-Host '[OK] Service removed.' }" ^
    "else { Write-Host '[INFO] Service not found or already removed.' }"

if exist daemon (
    rmdir /s /q daemon >nul 2>&1
    echo [OK] Cleaned up service files.
)

echo.
echo Done. Windows will no longer auto-start the card reader service.
echo.
pause
