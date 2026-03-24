'use client';

import React, { useState, useTransition } from 'react';
import type { TrainingSchedule, Registration } from '@/lib/course-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateQuotationAction, generateInvoiceAction, generateReceiptAction } from '@/app/erp/billing/actions';
import { sendBulkScheduleEmail } from '@/app/erp/attendees/actions';
import { runConnectionTest } from '@/app/admin/sync-test/actions';
import { Loader2, FileText, FileSignature, Receipt, Mail, CheckCircle2, XCircle, Info, Send, Zap, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface DocumentsClientPageProps {
    schedules: TrainingSchedule[];
    registrations: Registration[];
}

type LogStatus = 'info' | 'success' | 'failure';
type LogEntry = { step: string; status: LogStatus; details: string };

export function DocumentsClientPage({ schedules, registrations }: DocumentsClientPageProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // --- Tab 1: API Test ---
    const [testLogs, setTestLogs] = useState<LogEntry[]>([]);
    const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'failure'>('idle');

    const handleRunApiTest = () => {
        setTestStatus('running');
        setTestLogs([]);
        startTransition(async () => {
            const formData = new FormData();
            const result = await runConnectionTest({ logs: [], overallStatus: 'idle' }, formData);
            setTestLogs(result.logs || []);
            setTestStatus(result.overallStatus === 'success' ? 'success' : 'failure');
        });
    };

    // --- Tab 2: Generate Documents ---
    const [docSearch, setDocSearch] = useState('');
    const [docProcessingId, setDocProcessingId] = useState<string | null>(null);
    const [docRegistrations, setDocRegistrations] = useState<Registration[]>(registrations);

    const filteredRegs = docRegistrations.filter(r => {
        const q = docSearch.toLowerCase();
        return !q || r.clientCompanyName?.toLowerCase().includes(q) || r.courseTitle.toLowerCase().includes(q) || r.id.includes(q);
    });

    const handleDocGenerate = (action: (id: string) => Promise<any>, regId: string, type: string) => {
        setDocProcessingId(regId + type);
        startTransition(async () => {
            const result = await action(regId);
            if (result.success) {
                toast({ title: 'สำเร็จ', description: result.message });
                setDocRegistrations(prev => prev.map(r => r.id === regId ? {
                    ...r,
                    [`${type}Generated`]: true,
                    [`${type}Url`]: result.publicUrl,
                } : r));
            } else {
                toast({ variant: 'destructive', title: 'ผิดพลาด', description: result.message });
            }
            setDocProcessingId(null);
        });
    };

    // --- Tab 3: Bulk Email ---
    const [bulkScheduleId, setBulkScheduleId] = useState('');
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkBody, setBulkBody] = useState('');

    const handleSendBulkEmail = () => {
        if (!bulkScheduleId || !bulkSubject || !bulkBody) {
            toast({ variant: 'destructive', title: 'กรุณากรอกข้อมูลให้ครบ' });
            return;
        }
        startTransition(async () => {
            const result = await sendBulkScheduleEmail(bulkScheduleId, bulkSubject, bulkBody);
            if (result.success) {
                toast({ title: 'สำเร็จ', description: result.message });
                setBulkSubject('');
                setBulkBody('');
            } else {
                toast({ variant: 'destructive', title: 'ผิดพลาด', description: result.message });
            }
        });
    };

    const formatDate = (d: string) => {
        try { return format(new Date(d), 'd MMM yy', { locale: th }); } catch { return d; }
    };

    return (
        <Tabs defaultValue="api-test">
            <TabsList className="rounded-xl h-12 bg-muted/60 mb-2">
                <TabsTrigger value="api-test" className="rounded-lg">ทดสอบ API</TabsTrigger>
                <TabsTrigger value="generate" className="rounded-lg">สร้างเอกสาร</TabsTrigger>
                <TabsTrigger value="bulk-email" className="rounded-lg">อีเมลหมู่</TabsTrigger>
            </TabsList>

            {/* === Tab 1: API Connection Test === */}
            <TabsContent value="api-test">
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" />ทดสอบการเชื่อมต่อ Quotacraft API</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <Button onClick={handleRunApiTest} disabled={testStatus === 'running'} className="rounded-xl">
                            {testStatus === 'running' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                            เริ่มทดสอบ
                        </Button>
                        {testLogs.length > 0 && (
                            <div className="space-y-2 border rounded-xl p-4 bg-slate-50 dark:bg-slate-900">
                                {testLogs.map((log, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm">
                                        {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                                        {log.status === 'failure' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                                        {log.status === 'info' && <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                                        <div>
                                            <span className="font-semibold">{log.step}</span>
                                            {log.details && <p className="text-muted-foreground text-xs">{log.details}</p>}
                                        </div>
                                    </div>
                                ))}
                                <div className={cn("mt-3 pt-3 border-t font-bold text-sm", testStatus === 'success' ? 'text-green-600' : 'text-red-500')}>
                                    {testStatus === 'success' ? '✓ การเชื่อมต่อทุกขั้นตอนสำเร็จ' : '✗ พบข้อผิดพลาด กรุณาตรวจสอบ Logs'}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* === Tab 2: Generate Documents === */}
            <TabsContent value="generate">
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" />สร้างเอกสารสำหรับรายการลงทะเบียน</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <Input
                            placeholder="ค้นหาชื่อบริษัท / หลักสูตร / Registration ID..."
                            value={docSearch}
                            onChange={e => setDocSearch(e.target.value)}
                            className="rounded-xl h-11"
                        />
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/20">
                                    <tr>
                                        <th className="text-left p-3 font-semibold">บริษัท / หลักสูตร</th>
                                        <th className="text-left p-3 font-semibold">สถานะเอกสาร</th>
                                        <th className="text-right p-3 font-semibold pr-4">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredRegs.slice(0, 20).map(reg => (
                                        <tr key={reg.id} className="hover:bg-muted/5">
                                            <td className="p-3">
                                                <div className="font-medium">{reg.clientCompanyName || reg.userDisplayName}</div>
                                                <div className="text-xs text-muted-foreground">{reg.courseTitle}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    <Badge variant={reg.quotationGenerated ? "secondary" : "outline"} className={cn("text-[9px]", reg.quotationGenerated ? "bg-blue-100 text-blue-800" : "opacity-40")}>QT</Badge>
                                                    {reg.quotationUrl && <a href={reg.quotationUrl} target="_blank"><ExternalLink className="h-3 w-3 text-blue-500" /></a>}
                                                    <Badge variant={reg.invoiceGenerated ? "secondary" : "outline"} className={cn("text-[9px]", reg.invoiceGenerated ? "bg-green-100 text-green-800" : "opacity-40")}>INV</Badge>
                                                    {reg.invoiceUrl && <a href={reg.invoiceUrl} target="_blank"><ExternalLink className="h-3 w-3 text-green-500" /></a>}
                                                    <Badge variant={reg.receiptGenerated ? "secondary" : "outline"} className={cn("text-[9px]", reg.receiptGenerated ? "bg-purple-100 text-purple-800" : "opacity-40")}>RCPT</Badge>
                                                    {reg.receiptUrl && <a href={reg.receiptUrl} target="_blank"><ExternalLink className="h-3 w-3 text-purple-500" /></a>}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button size="sm" variant="outline" disabled={docProcessingId === reg.id + 'quotation'} onClick={() => handleDocGenerate(generateQuotationAction, reg.id, 'quotation')} className="rounded-lg text-xs h-8">
                                                        {docProcessingId === reg.id + 'quotation' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                                                    </Button>
                                                    <Button size="sm" disabled={docProcessingId === reg.id + 'invoice'} onClick={() => handleDocGenerate(generateInvoiceAction, reg.id, 'invoice')} className="rounded-lg text-xs h-8">
                                                        {docProcessingId === reg.id + 'invoice' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSignature className="h-3 w-3" />}
                                                    </Button>
                                                    <Button size="sm" variant={reg.invoiceGenerated ? "default" : "ghost"} disabled={!reg.invoiceGenerated || docProcessingId === reg.id + 'receipt'} onClick={() => reg.invoiceGenerated && handleDocGenerate(generateReceiptAction, reg.id, 'receipt')} className={cn("rounded-lg text-xs h-8", !reg.invoiceGenerated && "opacity-30")}>
                                                        {docProcessingId === reg.id + 'receipt' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRegs.length === 0 && (
                                        <tr><td colSpan={3} className="p-8 text-center text-muted-foreground italic">ไม่พบรายการ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-muted-foreground">QT = ใบเสนอราคา, INV = ใบแจ้งหนี้, RCPT = ใบเสร็จ (ต้องมี INV ก่อน)</p>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* === Tab 3: Bulk Email === */}
            <TabsContent value="bulk-email">
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-cyan-500" />ส่งอีเมลหมู่ไปยังผู้อบรมทุกคนในรอบ</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4 max-w-2xl">
                        <div>
                            <Label className="text-xs font-semibold">เลือกรอบอบรม</Label>
                            <Select value={bulkScheduleId} onValueChange={setBulkScheduleId}>
                                <SelectTrigger className="mt-1 rounded-xl h-11">
                                    <SelectValue placeholder="เลือกรอบ..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {schedules.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.courseTitle} — {formatDate(s.startDate)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">หัวเรื่องอีเมล</Label>
                            <Input value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} placeholder="หัวเรื่อง..." className="mt-1 rounded-xl" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">เนื้อหาอีเมล</Label>
                            <Textarea value={bulkBody} onChange={e => setBulkBody(e.target.value)} placeholder="เนื้อหาข้อความ..." className="mt-1 rounded-xl min-h-[120px]" />
                        </div>
                        <Button onClick={handleSendBulkEmail} disabled={isPending || !bulkScheduleId || !bulkSubject || !bulkBody} className="rounded-xl">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            ส่งอีเมลหมู่
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
