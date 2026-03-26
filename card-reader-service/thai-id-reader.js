'use strict';

/**
 * thai-id-reader.js
 * อ่านข้อมูลจากบัตรประชาชนไทย (Smart Card) ผ่าน PC/SC
 * รองรับเครื่องอ่านบัตร CCID ทุกรุ่น (ใช้ WinSCard.dll ที่มีอยู่ใน Windows)
 */

const pcsclite = require('pcsclite');

// ตาราง TIS-620 → Unicode (bytes 0xA1-0xFF)
// บัตรประชาชนไทยเข้ารหัสข้อความเป็น TIS-620 (Windows-874 compatible)
const TIS620_TABLE = [
    0x0E01,0x0E02,0x0E03,0x0E04,0x0E05,0x0E06,0x0E07,0x0E08, // A1-A8
    0x0E09,0x0E0A,0x0E0B,0x0E0C,0x0E0D,0x0E0E,0x0E0F,0x0E10, // A9-B0
    0x0E11,0x0E12,0x0E13,0x0E14,0x0E15,0x0E16,0x0E17,0x0E18, // B1-B8
    0x0E19,0x0E1A,0x0E1B,0x0E1C,0x0E1D,0x0E1E,0x0E1F,0x0E20, // B9-C0
    0x0E21,0x0E22,0x0E23,0x0E24,0x0E25,0x0E26,0x0E27,0x0E28, // C1-C8
    0x0E29,0x0E2A,0x0E2B,0x0E2C,0x0E2D,0x0E2E,0x0E2F,0x0E30, // C9-D0
    0x0E31,0x0E32,0x0E33,0x0E34,0x0E35,0x0E36,0x0E37,0x0E38, // D1-D8
    0x0E39,0x0E3A,0x0000,0x0000,0x0000,0x0000,0x0E3F,0x0E40, // D9-E0
    0x0E41,0x0E42,0x0E43,0x0E44,0x0E45,0x0E46,0x0E47,0x0E48, // E1-E8
    0x0E49,0x0E4A,0x0E4B,0x0E4C,0x0E4D,0x0E4E,0x0E4F,0x0E50, // E9-F0
    0x0E51,0x0E52,0x0E53,0x0E54,0x0E55,0x0E56,0x0E57,0x0E58, // F1-F8
    0x0E59,0x0E5A,0x0E5B,0x0000,0x0000,0x0000,0x0000,0x0000, // F9-FF
];

/**
 * แปลง Buffer ที่เข้ารหัส TIS-620 เป็น String Unicode
 * ตัด null bytes (0x00) และ spaces ส่วนท้ายออก
 */
function decodeTIS620(buffer) {
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte === 0x00) break; // null terminator
        if (byte >= 0xA1 && byte <= 0xFF) {
            const codePoint = TIS620_TABLE[byte - 0xA1];
            if (codePoint !== 0x0000) {
                result += String.fromCharCode(codePoint);
            }
        } else if (byte >= 0x20) {
            // ASCII printable characters (space and above)
            result += String.fromCharCode(byte);
        }
    }
    return result.trim();
}

/**
 * แปลงวันที่รูปแบบ YYYYMMDD (ASCII) เป็น ISO format YYYY-MM-DD
 */
function parseDate(buffer) {
    const raw = buffer.toString('ascii').replace(/\0/g, '').trim();
    if (raw.length === 8) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
    return raw;
}

/**
 * แยกชื่อ-นามสกุล และคำนำหน้า จาก FullNameTH
 * รูปแบบในบัตร: "คำนำหน้า#ชื่อ#นามสกุล" หรือ "คำนำหน้าชื่อ#นามสกุล"
 */
function parseThaName(fullNameTH) {
    const thaiTitles = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'ดร.', 'ศ.', 'รศ.', 'ผศ.'];
    let titleTH = '';
    let firstNameTH = '';
    let lastNameTH = '';

    // ชื่อในบัตรคั่นด้วย # ระหว่างส่วนต่างๆ
    const parts = fullNameTH.split('#').map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length >= 3) {
        titleTH = parts[0];
        firstNameTH = parts[1];
        lastNameTH = parts[2];
    } else if (parts.length === 2) {
        // "ชื่อ#นามสกุล" ไม่มีคำนำหน้า
        firstNameTH = parts[0];
        lastNameTH = parts[1];
    } else if (parts.length === 1) {
        // ลองตัดคำนำหน้าออกเอง
        let name = parts[0];
        for (const title of thaiTitles) {
            if (name.startsWith(title)) {
                titleTH = title;
                name = name.slice(title.length).trim();
                break;
            }
        }
        const spaceParts = name.split(' ');
        if (spaceParts.length >= 2) {
            firstNameTH = spaceParts[0];
            lastNameTH = spaceParts.slice(1).join(' ');
        } else {
            firstNameTH = name;
        }
    }

    return { titleTH, firstNameTH, lastNameTH };
}

/**
 * แยกชื่อภาษาอังกฤษ จาก FullNameEN
 * รูปแบบ: "MR#SOMCHAI#RAKDI" หรือ "SOMCHAI RAKDI"
 */
function parseEnName(fullNameEN) {
    const parts = fullNameEN.split('#').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 3) {
        return { firstNameEN: parts[1], lastNameEN: parts[2] };
    } else if (parts.length === 2) {
        return { firstNameEN: parts[0], lastNameEN: parts[1] };
    }
    const spaceParts = fullNameEN.split(' ');
    if (spaceParts.length >= 2) {
        return { firstNameEN: spaceParts[0], lastNameEN: spaceParts.slice(1).join(' ') };
    }
    return { firstNameEN: fullNameEN, lastNameEN: '' };
}

/**
 * ส่ง APDU command ไปยังบัตรและรับ response
 * @returns {Promise<Buffer>} response data (ไม่รวม SW1/SW2)
 */
function sendAPDU(reader, protocol, apdu) {
    return new Promise((resolve, reject) => {
        reader.transmit(Buffer.from(apdu), 256, protocol, (err, data) => {
            if (err) return reject(err);
            if (data.length < 2) return reject(new Error('Response too short'));
            const sw1 = data[data.length - 2];
            const sw2 = data[data.length - 1];
            if (sw1 !== 0x90 || sw2 !== 0x00) {
                return reject(new Error(`Card error: SW=${sw1.toString(16).padStart(2,'0')}${sw2.toString(16).padStart(2,'0')}`));
            }
            resolve(data.slice(0, data.length - 2));
        });
    });
}

/**
 * อ่านข้อมูลจากบัตรด้วย READ BINARY command
 * @param {number} offset - offset ใน bytes
 * @param {number} length - จำนวน bytes ที่ต้องการอ่าน
 */
async function readField(reader, protocol, offset, length) {
    const offsetHi = (offset >> 8) & 0xFF;
    const offsetLo = offset & 0xFF;
    const lenHi = (length >> 8) & 0xFF;
    const lenLo = length & 0xFF;
    const apdu = [0x80, 0xB0, offsetHi, offsetLo, 0x02, lenHi, lenLo];
    return sendAPDU(reader, protocol, apdu);
}

// field offsets ของบัตรประชาชนไทย (มาตรฐาน ISO 7816-4)
const FIELD_OFFSETS = {
    CID:        { offset: 0x0004, length: 74 },  // เลขบัตรประชาชน 13 หลัก (+ padding)
    FullNameTH: { offset: 0x00D3, length: 100 }, // ชื่อ-นามสกุล ภาษาไทย
    FullNameEN: { offset: 0x0137, length: 100 }, // ชื่อ-นามสกุล ภาษาอังกฤษ
    DateOfBirth:{ offset: 0x019B, length: 8 },   // วันเดือนปีเกิด YYYYMMDD
    Gender:     { offset: 0x01A3, length: 1 },   // เพศ (0x31=ชาย, 0x30=?, 0x32=หญิง)
    Address:    { offset: 0x01AC, length: 160 }, // ที่อยู่
    IssueDate:  { offset: 0x024C, length: 8 },   // วันออกบัตร
    ExpireDate: { offset: 0x0254, length: 8 },   // วันหมดอายุ
};

// AID ของแอปพลิเคชันบัตรประชาชนไทย
const THAI_ID_AID = [0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01];

let pcsc = null;
let readerStatus = 'no_reader'; // 'no_reader' | 'ready' | 'card_present'
let currentReader = null;
let currentProtocol = null;

/**
 * เริ่มต้น PC/SC และรับ reader status
 */
function initPCSC() {
    if (pcsc) return;
    pcsc = pcsclite();

    pcsc.on('reader', (reader) => {
        console.log(`[Card Reader] พบเครื่องอ่านบัตร: ${reader.name}`);
        currentReader = reader;
        readerStatus = 'ready';

        reader.on('status', (status) => {
            const changes = reader.state ^ status.state;
            if (changes & reader.SCARD_STATE_PRESENT) {
                if (status.state & reader.SCARD_STATE_PRESENT) {
                    readerStatus = 'card_present';
                    currentProtocol = null; // reset, will reconnect on read
                } else {
                    readerStatus = 'ready';
                    currentProtocol = null;
                }
            }
        });

        reader.on('end', () => {
            console.log(`[Card Reader] ถอดเครื่องอ่านบัตร: ${reader.name}`);
            if (currentReader === reader) {
                currentReader = null;
                currentProtocol = null;
                readerStatus = 'no_reader';
            }
        });

        reader.on('error', (err) => {
            console.error(`[Card Reader] Error: ${err.message}`);
        });
    });

    pcsc.on('error', (err) => {
        console.error('[PC/SC] Error:', err.message);
    });
}

/**
 * รับสถานะเครื่องอ่านบัตรปัจจุบัน
 */
function getReaderStatus() {
    return readerStatus;
}

/**
 * อ่านข้อมูลจากบัตรประชาชนไทย
 * @returns {Promise<object>} ข้อมูลจากบัตร
 */
function readThaiIdCard() {
    return new Promise((resolve, reject) => {
        if (!currentReader) {
            return reject(new Error('ไม่พบเครื่องอ่านบัตร กรุณาเสียบเครื่องอ่านและลองใหม่'));
        }

        const timeout = setTimeout(() => {
            reject(new Error('หมดเวลาอ่านบัตร (15 วินาที) กรุณาเสียบบัตรค้างไว้แล้วลองใหม่'));
        }, 15000);

        currentReader.connect({ share_mode: currentReader.SCARD_SHARE_SHARED }, async (err, protocol) => {
            if (err) {
                clearTimeout(timeout);
                return reject(new Error(`เชื่อมต่อบัตรไม่สำเร็จ: ${err.message}`));
            }
            currentProtocol = protocol;

            try {
                // 1. SELECT application by AID
                await sendAPDU(currentReader, protocol, THAI_ID_AID);

                // 2. อ่านทุก field
                const cidBuf = await readField(currentReader, protocol, FIELD_OFFSETS.CID.offset, FIELD_OFFSETS.CID.length);
                const nameTHBuf = await readField(currentReader, protocol, FIELD_OFFSETS.FullNameTH.offset, FIELD_OFFSETS.FullNameTH.length);
                const nameENBuf = await readField(currentReader, protocol, FIELD_OFFSETS.FullNameEN.offset, FIELD_OFFSETS.FullNameEN.length);
                const dobBuf = await readField(currentReader, protocol, FIELD_OFFSETS.DateOfBirth.offset, FIELD_OFFSETS.DateOfBirth.length);
                const genderBuf = await readField(currentReader, protocol, FIELD_OFFSETS.Gender.offset, FIELD_OFFSETS.Gender.length);
                const addressBuf = await readField(currentReader, protocol, FIELD_OFFSETS.Address.offset, FIELD_OFFSETS.Address.length);
                const issueBuf = await readField(currentReader, protocol, FIELD_OFFSETS.IssueDate.offset, FIELD_OFFSETS.IssueDate.length);
                const expireBuf = await readField(currentReader, protocol, FIELD_OFFSETS.ExpireDate.offset, FIELD_OFFSETS.ExpireDate.length);

                // 3. แปลงข้อมูล
                const citizenId = decodeTIS620(cidBuf).replace(/\D/g, ''); // เฉพาะตัวเลข
                const fullNameTH = decodeTIS620(nameTHBuf);
                const fullNameEN = nameENBuf.toString('ascii').replace(/\0/g, '').trim();
                const dob = parseDate(dobBuf);
                const issueDate = parseDate(issueBuf);
                const expireDate = parseDate(expireBuf);
                const address = decodeTIS620(addressBuf);

                // เพศ: 0x31 = '1' = ชาย, 0x32 = '2' = หญิง
                const genderByte = genderBuf[0];
                const gender = genderByte === 0x31 ? 'ชาย' : genderByte === 0x32 ? 'หญิง' : 'ไม่ระบุ';

                const { titleTH, firstNameTH, lastNameTH } = parseThaName(fullNameTH);
                const { firstNameEN, lastNameEN } = parseEnName(fullNameEN);

                clearTimeout(timeout);

                // ปิดการเชื่อมต่อ
                currentReader.disconnect(currentReader.SCARD_LEAVE_CARD, () => {});

                resolve({
                    citizenId,
                    titleTH,
                    firstNameTH,
                    lastNameTH,
                    firstNameEN,
                    lastNameEN,
                    dob,
                    gender,
                    address,
                    issueDate,
                    expireDate,
                });
            } catch (readErr) {
                clearTimeout(timeout);
                currentReader.disconnect(currentReader.SCARD_LEAVE_CARD, () => {});
                reject(readErr);
            }
        });
    });
}

module.exports = { initPCSC, readThaiIdCard, getReaderStatus };
