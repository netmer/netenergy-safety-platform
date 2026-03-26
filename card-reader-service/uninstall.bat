@echo off

echo.
echo Removing Card Reader Service...
echo.

REM Stop the running process (find by port 38080)
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 38080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
    "if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host '[OK] Service stopped.' }" ^
    "else { Write-Host '[INFO] Service was not running.' }"

REM Remove scheduled task
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
    "Unregister-ScheduledTask -TaskName 'CardReader-NETEnergy' -Confirm:$false -ErrorAction SilentlyContinue;" ^
    "if ((Get-ScheduledTask -TaskName 'CardReader-NETEnergy' -ErrorAction SilentlyContinue) -eq $null) { Write-Host '[OK] Auto-start task removed.' } else { Write-Host '[WARN] Could not remove task - remove manually from Task Scheduler.' }"

echo.
echo Done. Windows will no longer auto-start the card reader service.
echo.
pause
