'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SERVICE_URL = 'http://localhost:38080';
const HEALTH_POLL_MS = 5000;
const MIN_VERSION = '1.2.0'; // version ต่ำกว่านี้ให้แจ้งให้ reinstall

export type CardReaderStatus = 'checking' | 'connected' | 'disconnected' | 'no_reader';
export type CardReadState = 'idle' | 'reading' | 'success' | 'error';

export interface ThaiIdCardData {
    citizenId: string;
    titleTH: string;
    firstNameTH: string;
    lastNameTH: string;
    firstNameEN: string;
    lastNameEN: string;
    dob: string;       // ISO date YYYY-MM-DD
    gender: string;    // "ชาย" | "หญิง" | "ไม่ระบุ"
    address: string;
    issueDate: string;
    expireDate: string;
}

function versionAtLeast(v: string, min: string) {
    const a = v.split('.').map(Number);
    const b = min.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
        if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
    }
    return true;
}

export function useCardReader() {
    const [status, setStatus] = useState<CardReaderStatus>('checking');
    const [readState, setReadState] = useState<CardReadState>('idle');
    const [lastError, setLastError] = useState<string | null>(null);
    const [serviceVersion, setServiceVersion] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkHealth = useCallback(async () => {
        try {
            const res = await fetch(`${SERVICE_URL}/health`, {
                signal: AbortSignal.timeout(2000),
                cache: 'no-store',
            });
            if (res.ok) {
                const json = await res.json();
                setServiceVersion(json.version ?? null);
                if (json.version && !versionAtLeast(json.version, MIN_VERSION)) {
                    // Service เวอร์ชันเก่า — แสดงสถานะ disconnected เพื่อให้แสดง install dialog
                    setStatus('disconnected');
                } else {
                    setStatus(json.status === 'no_reader' ? 'no_reader' : 'connected');
                }
            } else {
                setStatus('disconnected');
            }
        } catch {
            setStatus('disconnected');
        }
    }, []);

    useEffect(() => {
        checkHealth();
        pollRef.current = setInterval(checkHealth, HEALTH_POLL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, [checkHealth]);

    const readCard = useCallback(async (): Promise<ThaiIdCardData> => {
        setReadState('reading');
        setLastError(null);
        try {
            const res = await fetch(`${SERVICE_URL}/read-card`, {
                signal: AbortSignal.timeout(15000),
                cache: 'no-store',
            });
            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.error || 'อ่านบัตรไม่สำเร็จ');
            }
            setReadState('success');
            resetTimerRef.current = setTimeout(() => setReadState('idle'), 3000);
            return json.data as ThaiIdCardData;
        } catch (e: any) {
            const msg = e.name === 'TimeoutError'
                ? 'หมดเวลา กรุณาเสียบบัตรค้างไว้แล้วลองใหม่'
                : (e.message || 'เกิดข้อผิดพลาดในการอ่านบัตร');
            setLastError(msg);
            setReadState('error');
            resetTimerRef.current = setTimeout(() => setReadState('idle'), 4000);
            throw new Error(msg);
        }
    }, []);

    const isOutdated = serviceVersion !== null && !versionAtLeast(serviceVersion, MIN_VERSION);
    return { status, readState, lastError, serviceVersion, isOutdated, readCard, checkHealth };
}
