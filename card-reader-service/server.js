'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initPCSC, readThaiIdCard, getReaderStatus } = require('./thai-id-reader');

const app = express();
const PORT = 38080;
const HOST = '127.0.0.1';

// Chrome Private Network Access (PNA): explicit OPTIONS preflight handler.
// Must come BEFORE cors so we fully control the preflight response.
// When an HTTPS page fetches http://localhost, Chrome sends OPTIONS with
// "Access-Control-Request-Private-Network: true" and requires the server
// to respond with "Access-Control-Allow-Private-Network: true".
function isAllowedOrigin(origin) {
    return !origin
        || origin.startsWith('http://localhost')
        || origin.startsWith('http://127.0.0.1')
        || origin.startsWith('https://');
}

app.options('*', (req, res) => {
    const origin = req.headers.origin || '';
    if (isAllowedOrigin(origin) && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
});

// Add PNA header to all non-OPTIONS responses as well
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});

// CORS for GET requests
app.use(cors({
    origin: (origin, callback) => {
        isAllowedOrigin(origin)
            ? callback(null, true)
            : callback(new Error('CORS: HTTP non-localhost blocked'));
    },
    methods: ['GET'],
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

// ลอง URL ทั้งสองเผื่อหนึ่งใช้ไม่ได้
const UPDATE_URLS = [
    'https://netenergy-safety-platform--netenergy-safety-platform.asia-southeast1.hosted.app/api/card-reader-files',
    'https://netenergy-safety-platform.web.app/api/card-reader-files',
];
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function checkForUpdates() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const localVersion = pkg.version;

        let res = null;
        for (const url of UPDATE_URLS) {
            try {
                res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'Cache-Control': 'no-cache' } });
                if (res.ok) break;
            } catch { res = null; }
        }
        if (!res || !res.ok) return;

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

        console.log(`[Update] Done — restarting service...`);
        // Exit code 1 = Task Scheduler จะ restart อัตโนมัติภายใน 30 วินาที
        // (ต้องติดตั้งด้วย install.bat v1.6+ เพื่อให้ RestartCount/RestartInterval ทำงาน)
        process.exit(1);

    } catch {
        // ถ้า update ล้มเหลว service ยังทำงานต่อด้วย version ปัจจุบัน
    }
}

setInterval(checkForUpdates, UPDATE_INTERVAL_MS);
