'use strict';

const express = require('express');
const cors = require('cors');
const { initPCSC, readThaiIdCard, getReaderStatus } = require('./thai-id-reader');

const app = express();
const PORT = 38080;
const HOST = '127.0.0.1'; // bind เฉพาะ localhost เพื่อความปลอดภัย

// อนุญาต CORS จาก localhost (dev) และ production domain
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://netenergy-safety-platform.web.app',
    'https://netenergy-safety-platform.firebaseapp.com',
];

// Chrome Private Network Access — ต้องใส่ header นี้เพื่อให้ HTTPS page เรียก localhost HTTP ได้
// https://developer.chrome.com/blog/private-network-access-update/
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        // อนุญาต requests ที่ไม่มี origin (เช่น curl, Postman) และ origins ที่อยู่ใน whitelist
        if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} ไม่ได้รับอนุญาต`));
        }
    },
    methods: ['GET', 'OPTIONS'],
}));

app.use(express.json());

/**
 * GET /health
 * ตรวจสอบสถานะบริการและเครื่องอ่านบัตร
 */
app.get('/health', (req, res) => {
    const status = getReaderStatus();
    res.json({
        ok: true,
        version: '1.0.0',
        status, // 'no_reader' | 'ready' | 'card_present'
        message: status === 'no_reader'
            ? 'บริการพร้อม แต่ไม่พบเครื่องอ่านบัตร กรุณาเสียบ USB เครื่องอ่านบัตร'
            : status === 'card_present'
            ? 'พบบัตรในเครื่องอ่าน พร้อมอ่านข้อมูล'
            : 'บริการพร้อมใช้งาน รอการเสียบบัตรประชาชน',
    });
});

/**
 * GET /read-card
 * อ่านข้อมูลจากบัตรประชาชนที่เสียบอยู่
 */
app.get('/read-card', async (req, res) => {
    try {
        const data = await readThaiIdCard();
        console.log(`[อ่านบัตรสำเร็จ] ID: ${data.citizenId} ชื่อ: ${data.titleTH}${data.firstNameTH} ${data.lastNameTH}`);
        res.json({ ok: true, data });
    } catch (err) {
        console.error(`[อ่านบัตรล้มเหลว] ${err.message}`);
        res.status(500).json({
            ok: false,
            error: err.message || 'อ่านบัตรไม่สำเร็จ กรุณาลองใหม่',
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'ไม่พบ endpoint ที่ร้องขอ' });
});

// เริ่ม PC/SC listener
try {
    initPCSC();
    console.log('[PC/SC] เริ่มต้นระบบอ่านบัตรสำเร็จ กำลังรอเครื่องอ่านบัตร...');
} catch (err) {
    console.error('[PC/SC] เริ่มต้นล้มเหลว:', err.message);
    console.error('กรุณาตรวจสอบ:');
    console.error('  1. Windows Smart Card Service (SCardSvr) ต้องเปิดใช้งาน');
    console.error('  2. รัน services.msc → Smart Card → ตั้งค่าเป็น Automatic');
}

app.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║    บริการอ่านบัตรประชาชนไทย - NET Energy ERP         ║');
    console.log(`║    รันที่: http://${HOST}:${PORT}               ║`);
    console.log('║    กด Ctrl+C เพื่อหยุดบริการ                        ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
});
