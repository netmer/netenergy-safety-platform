'use client';

import React, { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Terminal, CheckCircle2, Loader2, CreditCard, ExternalLink } from 'lucide-react';

interface CardReaderInstallDialogProps {
    open: boolean;
    onClose: () => void;
    /** 'disconnected' = service ไม่ได้เปิด, 'no_reader' = ไม่มีเครื่องอ่านบัตร */
    reason: 'disconnected' | 'no_reader';
}

export function CardReaderInstallDialog({ open, onClose, reason }: CardReaderInstallDialogProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch('/api/download-card-reader');
            if (!res.ok) throw new Error('ดาวน์โหลดล้มเหลว');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'card-reader-service.zip';
            a.click();
            URL.revokeObjectURL(url);
            setDownloaded(true);
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden">
                {/* Header */}
                <div className={`px-7 py-6 text-white ${reason === 'disconnected' ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <DialogTitle className="text-lg font-bold text-white">
                                {reason === 'disconnected' ? 'ต้องติดตั้งโปรแกรมอ่านบัตร' : 'ไม่พบเครื่องอ่านบัตร USB'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-white/80 text-sm mt-1">
                            {reason === 'disconnected'
                                ? 'ระบบอ่านบัตรประชาชนต้องใช้โปรแกรมช่วยที่รันบนเครื่องของคุณ กรุณาดาวน์โหลดและติดตั้งก่อนใช้งาน'
                                : 'บริการอ่านบัตรพร้อมแล้ว แต่ยังไม่พบเครื่องอ่านบัตรที่เสียบอยู่'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-5">
                    {reason === 'disconnected' ? (
                        <>
                            {/* ปุ่มดาวน์โหลด */}
                            <Button
                                className="w-full h-12 rounded-xl font-bold text-base gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" />กำลังเตรียมไฟล์...</>
                                ) : downloaded ? (
                                    <><CheckCircle2 className="w-5 h-5 text-emerald-300" />ดาวน์โหลดแล้ว — ดาวน์โหลดอีกครั้ง</>
                                ) : (
                                    <><Download className="w-5 h-5" />ดาวน์โหลดโปรแกรมอ่านบัตร (.zip)</>
                                )}
                            </Button>

                            {/* ขั้นตอนหลังดาวน์โหลด */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ขั้นตอนการติดตั้ง (ครั้งเดียว)</p>

                                {[
                                    {
                                        num: 1,
                                        Icon: Download,
                                        title: 'แตกไฟล์ ZIP',
                                        desc: 'แตกไฟล์ card-reader-service.zip ที่ดาวน์โหลดมา วางไว้ที่ไหนก็ได้',
                                    },
                                    {
                                        num: 2,
                                        Icon: Terminal,
                                        title: 'ดับเบิลคลิก install.bat',
                                        desc: 'ระบบจะขอสิทธิ์ Admin และติดตั้งอัตโนมัติ ต้องการ Node.js 18+',
                                    },
                                    {
                                        num: 3,
                                        Icon: CheckCircle2,
                                        title: 'เสร็จสิ้น — ไม่ต้องเปิดโปรแกรมค้างไว้',
                                        desc: 'บริการจะเริ่มทำงานอัตโนมัติทุกครั้งที่เปิดเครื่อง ปิด dialog แล้วกดอ่านบัตรได้เลย',
                                    },
                                ].map((step) => (
                                    <div key={step.num} className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                            {step.num}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                <step.Icon className="w-3.5 h-3.5 text-indigo-500" />
                                                {step.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[11px] text-slate-400 border-t pt-3">
                                ต้องการ Node.js 18+{' '}
                                <a
                                    href="https://nodejs.org/en/download"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                >
                                    ดาวน์โหลด Node.js <ExternalLink className="w-3 h-3" />
                                </a>
                            </p>
                        </>
                    ) : (
                        /* reason === 'no_reader' */
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-2">
                                <p className="font-bold text-sm text-amber-800 dark:text-amber-300">วิธีแก้ไข</p>
                                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 list-disc list-inside">
                                    <li>เสียบเครื่องอ่านบัตร USB เข้ากับคอมพิวเตอร์</li>
                                    <li>รอ Windows ติดตั้ง driver (ประมาณ 10-30 วินาที)</li>
                                    <li>ปิด dialog นี้แล้วกดปุ่ม &quot;อ่านบัตร ปชช.&quot; อีกครั้ง</li>
                                </ul>
                            </div>
                            <p className="text-xs text-slate-400">
                                เครื่องอ่านบัตร CCID มาตรฐานทุกรุ่นรองรับโดยไม่ต้องติดตั้ง driver เพิ่มเติม
                            </p>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="w-full rounded-xl font-bold"
                        onClick={onClose}
                    >
                        ปิด
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
