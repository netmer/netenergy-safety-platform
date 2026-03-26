@echo off
chcp 65001 >nul
echo.
echo ══════════════════════════════════════════════════════
echo    ติดตั้งบริการอ่านบัตรประชาชนไทย - NET Energy ERP
echo ══════════════════════════════════════════════════════
echo.

REM ตรวจสอบ Node.js
echo [1/4] ตรวจสอบ Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] ไม่พบ Node.js กรุณาติดตั้ง Node.js เวอร์ชัน 18 ขึ้นไปก่อน
    echo         ดาวน์โหลดที่: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] พบ Node.js %NODE_VERSION%

REM ตรวจสอบ npm
echo.
echo [2/4] ตรวจสอบ npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] พบ npm %NPM_VERSION%

REM ตรวจสอบ Windows Smart Card Service
echo.
echo [3/4] ตรวจสอบ Windows Smart Card Service...
sc query SCardSvr | findstr "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Windows Smart Card Service ยังไม่ได้เปิดใช้งาน
    echo        กำลังเปิดใช้งาน...
    sc config SCardSvr start= auto >nul 2>&1
    net start SCardSvr >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARN] ไม่สามารถเปิด Smart Card Service ได้โดยอัตโนมัติ
        echo        กรุณาเปิดด้วยตนเอง: services.msc → Smart Card → Start
    ) else (
        echo [OK] เปิด Smart Card Service สำเร็จ
    )
) else (
    echo [OK] Smart Card Service กำลังทำงานอยู่
)

REM ติดตั้ง dependencies
echo.
echo [4/4] ติดตั้ง dependencies (อาจใช้เวลาสักครู่)...
echo       หมายเหตุ: pcsclite ต้องการ Visual C++ Build Tools
echo       ถ้าติดตั้งไม่สำเร็จ ให้รัน: npm install --global windows-build-tools
echo.
npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install ล้มเหลว
    echo.
    echo วิธีแก้ไข:
    echo   1. เปิด PowerShell แบบ Administrator
    echo   2. รันคำสั่ง: npm install --global windows-build-tools
    echo   3. รันไฟล์ install.bat นี้อีกครั้ง
    echo.
    pause
    exit /b 1
)

echo.
echo ══════════════════════════════════════════════════════
echo    ติดตั้งสำเร็จ!
echo.
echo    รัน start.bat เพื่อเริ่มบริการอ่านบัตร
echo    หรือดับเบิลคลิก start.bat ในครั้งต่อๆ ไป
echo ══════════════════════════════════════════════════════
echo.
pause
