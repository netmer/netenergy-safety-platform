'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard, CheckCircle2, XCircle, RefreshCw, Download,
    Terminal, Monitor, Shield, Wifi, WifiOff, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICE_URL = 'http://localhost:38080';

type ServiceStatus = 'checking' | 'connected' | 'no_reader' | 'disconnected';

export default function CardReaderSetupPage() {
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking');
    const [isChecking, setIsChecking] = useState(false);
    const [readerMessage, setReaderMessage] = useState('');

    const checkService = useCallback(async () => {
        setIsChecking(true);
        setServiceStatus('checking');
        try {
            const res = await fetch(`${SERVICE_URL}/health`, {
                signal: AbortSignal.timeout(3000),
                cache: 'no-store',
            });
            if (res.ok) {
                const json = await res.json();
                setReaderMessage(json.message || '');
                setServiceStatus(json.status === 'no_reader' ? 'no_reader' : 'connected');
            } else {
                setServiceStatus('disconnected');
            }
        } catch {
            setServiceStatus('disconnected');
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        checkService();
    }, [checkService]);

    const StatusBadge = () => {
        switch (serviceStatus) {
            case 'checking':
                return <Badge variant="outline" className="gap-1.5 text-slate-500 border-slate-300"><RefreshCw className="w-3 h-3 animate-spin" />กำลังตรวจสอบ...</Badge>;
            case 'connected':
                return <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3" />บริการทำงานปกติ</Badge>;
            case 'no_reader':
                return <Badge className="gap-1.5 bg-amber-500 hover:bg-amber-600"><AlertTriangle className="w-3 h-3" />บริการพร้อม — ไม่พบเครื่องอ่าน</Badge>;
            case 'disconnected':
                return <Badge variant="destructive" className="gap-1.5"><XCircle className="w-3 h-3" />บริการไม่ได้ทำงาน</Badge>;
        }
    };

    const steps = [
        {
            num: 1,
            icon: <Download className="w-5 h-5" />,
            title: 'ติดตั้ง Node.js',
            desc: 'ต้องการ Node.js เวอร์ชัน 18 ขึ้นไป',
            detail: (
                <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        ตรวจสอบว่าติดตั้งแล้วโดยเปิด Command Prompt แล้วพิมพ์:
                    </p>
                    <code className="block bg-slate-900 text-emerald-400 text-xs px-4 py-2 rounded-lg font-mono">
                        node --version
                    </code>
                    <p className="text-xs text-slate-500">
                        ถ้าไม่พบ ดาวน์โหลดที่:{' '}
                        <span className="text-indigo-600 font-mono">https://nodejs.org/en/download</span>
                    </p>
                </div>
            ),
        },
        {
            num: 2,
            icon: <Terminal className="w-5 h-5" />,
            title: 'รัน install.bat',
            desc: 'ติดตั้ง dependencies ของบริการอ่านบัตร',
            detail: (
                <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        เปิด Windows Explorer ไปที่โฟลเดอร์{' '}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">card-reader-service</code>{' '}
                        ในโปรเจค แล้วดับเบิลคลิก:
                    </p>
                    <code className="block bg-slate-900 text-emerald-400 text-xs px-4 py-2 rounded-lg font-mono">
                        install.bat
                    </code>
                    <p className="text-xs text-slate-500">
                        ถ้าพบ error เกี่ยวกับ Build Tools ให้รันใน PowerShell (Admin):{' '}
                        <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">npm install --global windows-build-tools</code>
                    </p>
                </div>
            ),
        },
        {
            num: 3,
            icon: <Monitor className="w-5 h-5" />,
            title: 'เปิดบริการด้วย start.bat',
            desc: 'รันบริการอ่านบัตรในพื้นหลัง',
            detail: (
                <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        ดับเบิลคลิก <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">start.bat</code>{' '}
                        หน้าต่าง Command Prompt จะเปิดขึ้น ให้คงไว้ตลอดการใช้งาน
                    </p>
                    <code className="block bg-slate-900 text-emerald-400 text-xs px-4 py-2 rounded-lg font-mono">
                        start.bat
                    </code>
                    <p className="text-xs text-slate-500">
                        บริการจะรันที่ <code className="font-mono">http://localhost:38080</code>
                    </p>
                </div>
            ),
        },
        {
            num: 4,
            icon: <Shield className="w-5 h-5" />,
            title: 'ตรวจสอบ Smart Card Service ของ Windows',
            desc: 'Windows ต้องเปิดใช้งาน Smart Card Service',
            detail: (
                <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        เปิด <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">services.msc</code>{' '}
                        แล้วหา &quot;Smart Card&quot; ตั้งค่าเป็น Automatic และ Start
                    </p>
                    <p className="text-xs text-slate-500">
                        หรือรันใน Command Prompt (Admin):{' '}
                        <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono text-xs">sc start SCardSvr</code>
                    </p>
                </div>
            ),
        },
        {
            num: 5,
            icon: <CreditCard className="w-5 h-5" />,
            title: 'เสียบเครื่องอ่านบัตร USB',
            desc: 'รองรับเครื่องอ่านบัตร CCID มาตรฐานทุกรุ่น',
            detail: (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    เสียบเครื่องอ่านบัตร USB ที่ตัวเครื่อง Windows จะติดตั้ง driver อัตโนมัติ
                    สำหรับเครื่องอ่านบัตร CCID มาตรฐาน (ส่วนใหญ่ไม่ต้องติดตั้ง driver เพิ่มเติม)
                </p>
            ),
        },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-headline flex items-center gap-3">
                    <CreditCard className="w-7 h-7 text-indigo-600" />
                    ตั้งค่าเครื่องอ่านบัตรประชาชน
                </h1>
                <p className="text-muted-foreground mt-1.5">
                    ติดตั้งและตั้งค่าบริการอ่านบัตรประชาชนสำหรับกรอกข้อมูลอัตโนมัติ
                </p>
            </div>

            {/* Status Card */}
            <Card className={cn(
                'border-2 transition-colors',
                serviceStatus === 'connected' && 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20',
                serviceStatus === 'no_reader' && 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/20',
                serviceStatus === 'disconnected' && 'border-rose-200 bg-rose-50/30 dark:bg-rose-950/20',
                serviceStatus === 'checking' && 'border-slate-200',
            )}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="font-bold text-sm">สถานะบริการอ่านบัตร</p>
                        <StatusBadge />
                        {readerMessage && (
                            <p className="text-xs text-muted-foreground mt-1">{readerMessage}</p>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={checkService}
                        disabled={isChecking}
                    >
                        <RefreshCw className={cn('w-3.5 h-3.5', isChecking && 'animate-spin')} />
                        ตรวจสอบอีกครั้ง
                    </Button>
                </CardContent>
            </Card>

            {/* Status: Connected */}
            {(serviceStatus === 'connected' || serviceStatus === 'no_reader') && (
                <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardContent className="p-5 flex items-start gap-3">
                        {serviceStatus === 'connected' ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-emerald-800 dark:text-emerald-300">พร้อมใช้งาน!</p>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        บริการอ่านบัตรทำงานปกติ สามารถกลับไปใช้งานหน้า &quot;จัดการข้อมูลผู้อบรม&quot; และกดปุ่ม &quot;อ่านบัตร ปชช.&quot; ได้เลย
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-amber-800 dark:text-amber-300">บริการพร้อม แต่ไม่พบเครื่องอ่านบัตร</p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                                        กรุณาเสียบเครื่องอ่านบัตร USB แล้วกด &quot;ตรวจสอบอีกครั้ง&quot;
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Steps */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">ขั้นตอนการติดตั้ง</CardTitle>
                    <CardDescription>ทำตามขั้นตอนเหล่านี้เพื่อเปิดใช้งานระบบอ่านบัตรประชาชน</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {steps.map((step) => (
                        <div key={step.num} className="flex gap-4">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                                    {step.num}
                                </div>
                                {step.num < steps.length && (
                                    <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1" />
                                )}
                            </div>
                            <div className="pb-5 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-indigo-600 dark:text-indigo-400">{step.icon}</span>
                                    <p className="font-bold text-sm">{step.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">{step.desc}</p>
                                {step.detail}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
                <CardContent className="p-5 space-y-2">
                    <p className="text-sm font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-500" />
                        ข้อมูลความปลอดภัย
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>บริการนี้รันเฉพาะบน localhost (127.0.0.1) ไม่เปิดเผยออกอินเทอร์เน็ต</li>
                        <li>ข้อมูลบัตรประชาชนส่งตรงจากเครื่องไปยังระบบ ERP โดยไม่ผ่านเซิร์ฟเวอร์ภายนอก</li>
                        <li>รองรับเครื่องอ่านบัตร CCID/ISO 7816 มาตรฐานทุกรุ่น</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
