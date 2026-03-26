@echo off
chcp 65001 >nul
echo.
echo กำลังเริ่มบริการอ่านบัตรประชาชนไทย...
echo กด Ctrl+C เพื่อหยุดบริการ
echo.

REM ตรวจสอบว่าติดตั้งแล้วหรือยัง
if not exist "node_modules" (
    echo [ERROR] ยังไม่ได้ติดตั้ง กรุณารัน install.bat ก่อน
    pause
    exit /b 1
)

node server.js
pause
