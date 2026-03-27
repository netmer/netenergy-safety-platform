'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import type { ExamTemplate } from '@/lib/course-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Copy, Check, ExternalLink } from 'lucide-react';

function QrSection({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    function handleCopy() {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: 'คัดลอกลิงก์แล้ว' });
        });
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-inner">
                <QRCode
                    value={url}
                    size={200}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 256 256"
                />
            </div>
            <p className="text-xs text-muted-foreground text-center">
                ไม่ต้องล็อกอิน สแกนหรือเปิดลิงก์ได้ทันที
            </p>
            <div className="flex gap-2 w-full">
                <Input value={url} readOnly className="rounded-xl text-xs h-9 flex-1" />
                <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl shrink-0" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </Button>
            </div>
        </div>
    );
}

export function ExamQrButton({
    scheduleId,
    template,
}: {
    scheduleId: string;
    template?: ExamTemplate | null;
}) {
    const [open, setOpen] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl = `${origin}/exam/${scheduleId}`;

    const hasPretest = template?.examMode === 'pretest_only' || template?.examMode === 'both';
    const hasPosttest = template?.examMode === 'posttest_only' || template?.examMode === 'both';
    const hasBoth = hasPretest && hasPosttest;

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => setOpen(true)}
            >
                <QrCode className="w-4 h-4" />
                QR Code ข้อสอบ
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-3xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-blue-600" />
                            QR Code แบบทดสอบ
                        </DialogTitle>
                    </DialogHeader>

                    {hasBoth ? (
                        <Tabs defaultValue="all">
                            <TabsList className="rounded-xl w-full mb-2">
                                <TabsTrigger value="all" className="flex-1 rounded-lg">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="pretest" className="flex-1 rounded-lg">ก่อนเรียน</TabsTrigger>
                                <TabsTrigger value="posttest" className="flex-1 rounded-lg">หลังเรียน</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all">
                                <QrSection url={baseUrl} />
                            </TabsContent>
                            <TabsContent value="pretest">
                                <QrSection url={`${baseUrl}?focus=pretest`} />
                            </TabsContent>
                            <TabsContent value="posttest">
                                <QrSection url={`${baseUrl}?focus=posttest`} />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <QrSection url={baseUrl} />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
