'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initPCSC, readThaiIdCard, getReaderStatus } = require('./thai-id-reader');

const app = express();
const PORT = 38080;
const HOST = '127.0.0.1';

// Chrome Private Network Access header (required for HTTPS pages calling http://localhost)
// https://developer.chrome.com/blog/private-network-access-update/
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});

// Service binds to 127.0.0.1 only — not internet-accessible.
// Safe to allow any HTTPS origin so any deployed URL works without reconfiguring.
app.use(cors({
    origin: (origin, callback) => {
        const ok = !origin                               // curl / Postman
            || origin.startsWith('http://localhost')     // local dev
            || origin.startsWith('http://127.0.0.1')
            || origin.startsWith('https://');            // any HTTPS deployment URL
        ok ? callback(null, true) : callback(new Error(`CORS: HTTP non-localhost blocked`));
    },
    methods: ['GET', 'OPTIONS'],
}));

app.use(express.json());

/** GET /health */
app.get('/health', (req, res) => {
    const status = getReaderStatus();
    res.json({
        ok: true,
        version: require('./package.json').version,
        status,
        message: status === 'no_reader'    ? 'บริการพร้อม แต่ไม่พบเครื่องอ่านบัตร กรุณาเสียบ USB เครื่องอ่านบัตร'
               : status === 'card_present' ? 'พบบัตรในเครื่องอ่าน พร้อมอ่านข้อมูล'
               : status === 'checking'     ? 'กำลังตรวจสอบเครื่องอ่านบัตร...'
               :                            'บริการพร้อมใช้งาน รอการเสียบบัตรประชาชน',
    });
});

/** GET /read-card */
app.get('/read-card', async (req, res) => {
    try {
        const data = await readThaiIdCard();
        console.log(`[OK] Card read: ${data.citizenId}`);
        res.json({ ok: true, data });
    } catch (err) {
        console.error(`[FAIL] Card read: ${err.message}`);
        res.status(500).json({ ok: false, error: err.message || 'อ่านบัตรไม่สำเร็จ' });
    }
});

app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'Not found' });
});

// เริ่ม PC/SC listener
try {
    initPCSC();
} catch (err) {
    console.error('[PC/SC] Init failed:', err.message);
}

app.listen(PORT, HOST, () => {
    const ver = require('./package.json').version;
    console.log(`[OK] Card Reader Service v${ver} running on http://${HOST}:${PORT}`);
    // ตรวจสอบ update หลังจาก server พร้อม
    setTimeout(checkForUpdates, 10 * 1000);
});

// -- Auto-update ---------------------------------------------------------------
// ดาวน์โหลดไฟล์ล่าสุดจาก web app อัตโนมัติ ไม่ต้องลงใหม่ด้วยตนเอง

const UPDATE_URL = 'https://netenergy-safety-platform.web.app/api/card-reader-files';
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function checkForUpdates() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const localVersion = pkg.version;

        const res = await fetch(UPDATE_URL, {
            signal: AbortSignal.timeout(15000),
            headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;

        const { version: remoteVersion, files } = await res.json();
        if (!remoteVersion || remoteVersion === localVersion) return;

        console.log(`[Update] ${localVersion} → ${remoteVersion} — downloading...`);

        // เขียนไฟล์ที่อัปเดต
        for (const [name, content] of Object.entries(files)) {
            if (typeof content !== 'string') continue;
            fs.writeFileSync(path.join(__dirname, name), content, 'utf8');
        }

        // อัปเดต version ใน package.json
        pkg.version = remoteVersion;
        fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

        console.log(`[Update] Done — restarting service (node-windows will restart automatically)`);
        // node-windows จะ restart service ให้อัตโนมัติ
        process.exit(0);

    } catch {
        // ถ้า update ล้มเหลว service ยังทำงานต่อด้วย version ปัจจุบัน
    }
}

setInterval(checkForUpdates, UPDATE_INTERVAL_MS);
