'use client';

import React, { useState, useMemo, useTransition } from 'react';
import type { Registration, Course, PaymentRecord } from '@/lib/course-data';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateQuotationAction, generateInvoiceAction, generateReceiptAction, addPaymentRecord, setRegistrationTotalAmount } from './actions';
import { Loader2, FileText, FileSignature, Search, ExternalLink, Receipt, Banknote, Plus } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface BillingClientPageProps {
    initialRegistrations: Registration[];
    courses: Course[];
}

export function BillingClientPage({ initialRegistrations, courses }: BillingClientPageProps) {
    const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
    const [isPending, startTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Payment dialog state
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentReg, setPaymentReg] = useState<Registration | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['method']>('transfer');
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [totalAmountInput, setTotalAmountInput] = useState('');

    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    const handleGenerate = (action: (id: string) => Promise<any>, registrationId: string, type: 'quotation' | 'invoice' | 'receipt') => {
        setProcessingId(registrationId + type);
        startTransition(async () => {
            try {
                const result = await action(registrationId);
                if (result.success) {
                    toast({ title: 'สำเร็จ', description: result.message });
                    setRegistrations(prev => prev.map(r => {
                        if (r.id === registrationId) {
                            return {
                                ...r,
                                [`${type}Generated`]: true,
                                [`${type}Url`]: result.publicUrl,
                            };
                        }
                        return r;
                    }));
                } else {
                    toast({ variant: 'destructive', title: 'การเชื่อมต่อ API ผิดพลาด', description: result.message });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: error instanceof Error ? error.message : 'กรุณาตรวจสอบการตั้งค่า API' });
            } finally {
                setProcessingId(null);
            }
        });
    };

    const handleOpenPaymentDialog = (reg: Registration) => {
        setPaymentReg(reg);
        setPaymentAmount('');
        setPaymentMethod('transfer');
        setPaymentRef('');
        setPaymentNotes('');
        setTotalAmountInput(reg.totalAmount?.toString() || '');
        setPaymentDialogOpen(true);
    };

    const handleSavePayment = () => {
        if (!paymentReg) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'ข้อผิดพลาด', description: 'กรุณากรอกจำนวนเงินที่ถูกต้อง' });
            return;
        }
        startTransition(async () => {
            // Update total if changed
            const newTotal = parseFloat(totalAmountInput);
            if (!isNaN(newTotal) && newTotal !== paymentReg.totalAmount) {
                await setRegistrationTotalAmount(paymentReg.id, newTotal);
            }
            const result = await addPaymentRecord(paymentReg.id, {
                amount,
                paidDate: new Date().toISOString(),
                method: paymentMethod,
                reference: paymentRef || undefined,
                notes: paymentNotes || undefined,
                recordedBy: 'ERP Staff',
            });
            if (result.success) {
                toast({ title: 'สำเร็จ', description: result.message });
                setRegistrations(prev => prev.map(r => {
                    if (r.id === paymentReg.id) {
                        const updated = { ...r, amountPaid: (r.amountPaid || 0) + amount };
                        const total = newTotal || r.totalAmount || 0;
                        updated.paymentStatus = updated.amountPaid === 0 ? 'unpaid' : updated.amountPaid < total ? 'partial' : 'paid';
                        return updated;
                    }
                    return r;
                }));
                setPaymentDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'ข้อผิดพลาด', description: result.message });
            }
        });
    };

    const filteredRegistrations = useMemo(() => {
        return registrations.filter(reg => {
            const matchesCourse = courseFilter === 'all' || reg.courseId === courseFilter;
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch = !debouncedSearch ||
                (reg.clientCompanyName && reg.clientCompanyName.toLowerCase().includes(searchLower)) ||
                reg.courseTitle.toLowerCase().includes(searchLower);
            return matchesCourse && matchesSearch;
        });
    }, [registrations, debouncedSearch, courseFilter]);

    const paymentStatusBadge = (status?: Registration['paymentStatus']) => {
        if (!status || status === 'unpaid') return <Badge variant="outline" className="text-[9px] font-bold opacity-50">UNPAID</Badge>;
        if (status === 'partial') return <Badge className="text-[9px] font-bold bg-yellow-100 text-yellow-800 border-yellow-200">PARTIAL</Badge>;
        return <Badge className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border-emerald-200">PAID</Badge>;
    };

    return (
        <>
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-8">
                    <CardTitle className="text-2xl font-bold font-headline">ศูนย์กลางการเงินและบัญชี</CardTitle>
                    <CardDescription>จัดการใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และการชำระเงิน</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาชื่อบริษัท..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 rounded-xl"
                            />
                        </div>
                        <Select value={courseFilter} onValueChange={setCourseFilter}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="กรองตามหลักสูตร" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                                {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>{course.shortName || course.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="border rounded-2xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow>
                                    <TableHead className="font-bold py-4">บริษัท / ผู้ติดต่อ</TableHead>
                                    <TableHead className="font-bold">หลักสูตร</TableHead>
                                    <TableHead className="font-bold">เอกสาร</TableHead>
                                    <TableHead className="font-bold">การชำระเงิน</TableHead>
                                    <TableHead className="text-right font-bold pr-6">ดำเนินการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.length > 0 ? filteredRegistrations.map((reg) => {
                                    const isQProcessing = processingId === reg.id + 'quotation';
                                    const isIProcessing = processingId === reg.id + 'invoice';
                                    const isRProcessing = processingId === reg.id + 'receipt';
                                    return (
                                        <TableRow key={reg.id} className="hover:bg-muted/5">
                                            <TableCell className="py-6">
                                                <div className="font-bold text-slate-900 dark:text-white">{reg.clientCompanyName || 'ข้อมูลส่วนบุคคล'}</div>
                                                <div className="text-xs text-muted-foreground">{reg.formData?.coordinator?.name || reg.userDisplayName}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate text-sm" title={coursesMap.get(reg.courseId)?.title}>
                                                    {coursesMap.get(reg.courseId)?.shortName || reg.courseTitle}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={reg.quotationGenerated ? "secondary" : "outline"} className={cn("text-[9px] font-bold tracking-widest", reg.quotationGenerated ? "bg-blue-100 text-blue-800 border-blue-200" : "opacity-40")}>
                                                            QT
                                                        </Badge>
                                                        {reg.quotationUrl && <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={reg.quotationUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5"/></a></Button>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={reg.invoiceGenerated ? "secondary" : "outline"} className={cn("text-[9px] font-bold tracking-widest", reg.invoiceGenerated ? "bg-green-100 text-green-800 border-green-200" : "opacity-40")}>
                                                            INV
                                                        </Badge>
                                                        {reg.invoiceUrl && <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={reg.invoiceUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5"/></a></Button>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={reg.receiptGenerated ? "secondary" : "outline"} className={cn("text-[9px] font-bold tracking-widest", reg.receiptGenerated ? "bg-purple-100 text-purple-800 border-purple-200" : "opacity-40")}>
                                                            RCPT
                                                        </Badge>
                                                        {reg.receiptUrl && <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={reg.receiptUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5"/></a></Button>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {paymentStatusBadge(reg.paymentStatus)}
                                                    {reg.totalAmount != null && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {(reg.amountPaid || 0).toLocaleString()} / {reg.totalAmount.toLocaleString()} ฿
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex gap-1.5 justify-end flex-wrap">
                                                    <Button variant="outline" size="sm" onClick={() => handleGenerate(generateQuotationAction, reg.id, 'quotation')} disabled={isQProcessing} className="rounded-xl h-9 font-semibold text-xs">
                                                        {isQProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileText className="mr-1 h-3 w-3" />}
                                                        {reg.quotationGenerated ? 'QT ใหม่' : 'สร้าง QT'}
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleGenerate(generateInvoiceAction, reg.id, 'invoice')} disabled={isIProcessing} className="rounded-xl h-9 font-semibold text-xs">
                                                        {isIProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileSignature className="mr-1 h-3 w-3" />}
                                                        {reg.invoiceGenerated ? 'INV ใหม่' : 'สร้าง INV'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={reg.invoiceGenerated ? "default" : "ghost"}
                                                        onClick={() => reg.invoiceGenerated && handleGenerate(generateReceiptAction, reg.id, 'receipt')}
                                                        disabled={isRProcessing || !reg.invoiceGenerated}
                                                        className={cn("rounded-xl h-9 font-semibold text-xs", !reg.invoiceGenerated && "opacity-40 cursor-not-allowed")}
                                                        title={!reg.invoiceGenerated ? 'ต้องสร้างใบแจ้งหนี้ก่อน' : ''}
                                                    >
                                                        {isRProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Receipt className="mr-1 h-3 w-3" />}
                                                        {reg.receiptGenerated ? 'RCPT ใหม่' : 'สร้าง RCPT'}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleOpenPaymentDialog(reg)} className="rounded-xl h-9 font-semibold text-xs">
                                                        <Banknote className="mr-1 h-3 w-3" />
                                                        ชำระ
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic font-light">
                                            ไม่พบรายการที่ตรงกับเงื่อนไข
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
                        <p className="text-sm text-muted-foreground">{paymentReg?.clientCompanyName || paymentReg?.userDisplayName}</p>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-semibold">ยอดรวมทั้งหมด (฿)</Label>
                                <Input value={totalAmountInput} onChange={e => setTotalAmountInput(e.target.value)} placeholder="0" className="mt-1 rounded-xl" type="number" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">จำนวนเงินที่รับ (฿) *</Label>
                                <Input value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0" className="mt-1 rounded-xl" type="number" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">วิธีชำระเงิน</Label>
                            <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentRecord['method'])}>
                                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transfer">โอนเงิน</SelectItem>
                                    <SelectItem value="cash">เงินสด</SelectItem>
                                    <SelectItem value="cheque">เช็ค</SelectItem>
                                    <SelectItem value="other">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">เลขอ้างอิง (optional)</Label>
                            <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="เลขโอน / เลขเช็ค" className="mt-1 rounded-xl" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">หมายเหตุ</Label>
                            <Input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="หมายเหตุเพิ่มเติม" className="mt-1 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl">ยกเลิก</Button>
                        <Button onClick={handleSavePayment} disabled={isPending} className="rounded-xl">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
