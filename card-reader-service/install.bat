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
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$dir = '%~dp0'.TrimEnd('\\');" ^
    "$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source;" ^
    "if (-not $nodePath) { $nodePath = 'node.exe' };" ^
    "$action = New-ScheduledTaskAction -Execute $nodePath -Argument 'server.js' -WorkingDirectory $dir;" ^
    "$trigger = New-ScheduledTaskTrigger -AtLogOn;" ^
    "$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries;" ^
    "$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;" ^
    "Unregister-ScheduledTask -TaskName 'CardReader-NETEnergy' -Confirm:$false -ErrorAction SilentlyContinue;" ^
    "$result = Register-ScheduledTask -TaskName 'CardReader-NETEnergy' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -ErrorAction SilentlyContinue;" ^
    "if ($result) { Write-Host '[OK] Auto-start task registered.' } else { Write-Host '[WARN] Task registration failed - service will need to be started manually.' }"

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
