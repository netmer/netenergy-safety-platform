# บริการอ่านบัตรประชาชนไทย (Thai ID Card Reader Service)

บริการ Node.js สำหรับอ่านข้อมูลจากบัตรประชาชนไทยผ่านเครื่องอ่านบัตร CCID/USB Smart Card

## ความต้องการของระบบ

- Windows 7/10/11
- Node.js 18 หรือสูงกว่า ([ดาวน์โหลด](https://nodejs.org))
- Visual C++ Build Tools (สำหรับ compile pcsclite)
- เครื่องอ่านบัตร USB Smart Card (รองรับ CCID มาตรฐาน)

## การติดตั้ง

1. ดับเบิลคลิก **`install.bat`**
2. รอจนการติดตั้งเสร็จสมบูรณ์

## การใช้งาน

1. ดับเบิลคลิก **`start.bat`** เพื่อเริ่มบริการ
2. เปิดระบบ ERP ในเบราว์เซอร์
3. กดปุ่ม "อ่านบัตร ปชช." ในหน้าจัดการผู้อบรม
4. เสียบบัตรประชาชนในเครื่องอ่านบัตร
5. ข้อมูลจะถูกกรอกอัตโนมัติ

## API Endpoints

- `GET http://localhost:38080/health` — ตรวจสอบสถานะ
- `GET http://localhost:38080/read-card` — อ่านข้อมูลบัตร

## แก้ไขปัญหา

### npm install ล้มเหลว
รันคำสั่งใน PowerShell แบบ Administrator:
```powershell
npm install --global windows-build-tools
```

### Smart Card Service ไม่ทำงาน
1. เปิด `services.msc`
2. หา "Smart Card"
3. คลิกขวา → Properties → Startup type: **Automatic**
4. คลิก Start
