'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SERVICE_URL = 'http://localhost:38080';
const HEALTH_POLL_MS = 5000;

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

export function useCardReader() {
    const [status, setStatus] = useState<CardReaderStatus>('checking');
    const [readState, setReadState] = useState<CardReadState>('idle');
    const [lastError, setLastError] = useState<string | null>(null);
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
                setStatus(json.status === 'no_reader' ? 'no_reader' : 'connected');
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

    return { status, readState, lastError, readCard, checkHealth };
}
