import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GET /api/card-reader-files
 * Returns the latest updatable service files as JSON.
 * The service calls this on startup to auto-update itself.
 */

const UPDATABLE = ['server.js', 'thai-id-reader.js', 'thai-card.ps1'];

export async function GET() {
    try {
        const dir = path.join(process.cwd(), 'card-reader-service');
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

        const files: Record<string, string> = {};
        for (const name of UPDATABLE) {
            files[name] = fs.readFileSync(path.join(dir, name), 'utf8');
        }

        return NextResponse.json(
            { version: pkg.version, files },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
