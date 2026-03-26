'use strict';

/**
 * thai-id-reader.js
 * อ่านข้อมูลจากบัตรประชาชนไทยผ่าน PowerShell + WinSCard P/Invoke
 * ไม่ต้องการ Visual C++ Build Tools — ใช้ winscard.dll ที่มีอยู่ใน Windows
 */

const { spawn } = require('child_process');
const path = require('path');

const PS_SCRIPT = path.join(__dirname, 'thai-card.ps1');

/**
 * รัน thai-card.ps1 ผ่าน PowerShell และ parse JSON output
 * @param {'status'|'read'} mode
 * @returns {Promise<object>}
 */
function runPS(mode) {
    return new Promise((resolve, reject) => {
        const ps = spawn('powershell', [
            '-NonInteractive',
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', PS_SCRIPT,
            '-mode', mode,
        ], { timeout: 20000 });

        let stdout = '';
        let stderr = '';
        ps.stdout.on('data', (d) => { stdout += d; });
        ps.stderr.on('data', (d) => { stderr += d; });

        ps.on('close', () => {
            const raw = stdout.trim();
            try {
                resolve(JSON.parse(raw));
            } catch {
                reject(new Error(`PowerShell error: ${(stderr || raw).slice(0, 300)}`));
            }
        });

        ps.on('error', (err) => {
            reject(new Error(`ไม่สามารถรัน PowerShell: ${err.message}`));
        });
    });
}

// -- Status tracking (polled every 5s) ----------------------------------------

let _status = 'checking'; // 'checking' | 'no_reader' | 'ready' | 'card_present'

async function _updateStatus() {
    try {
        const result = await runPS('status');
        _status = result.status || 'no_reader';
    } catch {
        _status = 'no_reader';
    }
}

function initPCSC() {
    _updateStatus();
    setInterval(_updateStatus, 5000);
}

function getReaderStatus() {
    return _status;
}

// -- Card reader ---------------------------------------------------------------

async function readThaiIdCard() {
    const result = await runPS('read');

    if (!result.ok) {
        const msg =
            result.error === 'no_reader' ? 'ไม่พบเครื่องอ่านบัตร กรุณาเสียบเครื่องอ่านและลองใหม่' :
            result.error === 'no_card'   ? 'ไม่พบบัตรในเครื่องอ่าน กรุณาเสียบบัตรประชาชนแล้วลองใหม่' :
                                           (result.error || 'อ่านบัตรไม่สำเร็จ กรุณาลองใหม่');
        throw new Error(msg);
    }

    return result.data;
}

module.exports = { initPCSC, readThaiIdCard, getReaderStatus };
