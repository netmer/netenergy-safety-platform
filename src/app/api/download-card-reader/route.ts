import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ── Minimal ZIP creator (ไม่ต้องใช้ external package) ──────────────────────────

// ตาราง CRC-32
const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
    }
    return t;
})();

function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u16(v: number) { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; }
function u32(v: number) { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; }

function createZip(files: { name: string; content: Buffer }[]): Buffer {
    const locals: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    // DOS timestamp: 2025-01-01 00:00:00
    const dosDate = ((2025 - 1980) << 9) | (1 << 5) | 1; // 0x5A21
    const dosTime = 0;

    for (const file of files) {
        const name = Buffer.from(file.name, 'utf8');
        const compressed = zlib.deflateRawSync(file.content, { level: 6 });
        const crc = crc32(file.content);

        const local = Buffer.concat([
            Buffer.from([0x50, 0x4B, 0x03, 0x04]),
            u16(20), u16(0), u16(8),
            u16(dosTime), u16(dosDate),
            u32(crc), u32(compressed.length), u32(file.content.length),
            u16(name.length), u16(0),
            name,
        ]);

        locals.push(local, compressed);

        central.push(Buffer.concat([
            Buffer.from([0x50, 0x4B, 0x01, 0x02]),
            u16(20), u16(20), u16(0), u16(8),
            u16(dosTime), u16(dosDate),
            u32(crc), u32(compressed.length), u32(file.content.length),
            u16(name.length), u16(0), u16(0),
            u16(0), u16(0), u32(0),
            u32(offset),
            name,
        ]));

        offset += local.length + compressed.length;
    }

    const centralBuf = Buffer.concat(central);
    return Buffer.concat([
        ...locals,
        centralBuf,
        Buffer.from([0x50, 0x4B, 0x05, 0x06]),
        u16(0), u16(0),
        u16(files.length), u16(files.length),
        u32(centralBuf.length), u32(offset),
        u16(0),
    ]);
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function GET() {
    try {
        const serviceDir = path.join(process.cwd(), 'card-reader-service');

        const fileNames = [
            'package.json',
            'server.js',
            'thai-id-reader.js',
            'install-service.js',
            'uninstall-service.js',
            'install.bat',
            'uninstall.bat',
            'README.md',
        ];

        const files = fileNames.map((name) => ({
            name: `card-reader-service/${name}`,
            content: fs.readFileSync(path.join(serviceDir, name)),
        }));

        const zipBuffer = createZip(files);

        return new NextResponse(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="card-reader-service.zip"',
                'Content-Length': String(zipBuffer.length),
                'Cache-Control': 'no-store',
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: `ไม่สามารถสร้างไฟล์ดาวน์โหลดได้: ${err.message}` },
            { status: 500 }
        );
    }
}
