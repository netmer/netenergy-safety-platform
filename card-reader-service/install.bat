@echo off
echo.
echo ======================================================
echo   Card Reader Service - NET Energy ERP
echo   Installing dependencies...
echo ======================================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Please install Node.js 18+ from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] npm %NPM_VER%

REM Enable Windows Smart Card Service
echo.
echo [3/4] Checking Windows Smart Card Service...
sc query SCardSvr | findstr "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Enabling Smart Card Service...
    sc config SCardSvr start= auto >nul 2>&1
    net start SCardSvr >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARN] Could not start Smart Card Service automatically.
        echo Please open services.msc, find "Smart Card", and set it to Automatic + Start.
    ) else (
        echo [OK] Smart Card Service started.
    )
) else (
    echo [OK] Smart Card Service is running.
)

REM Install npm dependencies
echo.
echo [4/4] Installing npm packages (this may take a moment)...
echo Note: pcsclite requires Visual C++ Build Tools to compile.
echo If this fails, run in Admin PowerShell: npm install --global windows-build-tools
echo.
npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed.
    echo.
    echo To fix:
    echo   1. Open PowerShell as Administrator
    echo   2. Run: npm install --global windows-build-tools
    echo   3. Run install.bat again
    echo.
    pause
    exit /b 1
)

echo.
echo ======================================================
echo   Installation complete!
echo   Run start.bat to launch the card reader service.
echo ======================================================
echo.
pause
