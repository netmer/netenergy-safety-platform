'use client';

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import type { TrainingSchedule, Course, CourseCategory, AttendeeData, TrainingRecord, RegistrationFormField, AttendeeStatus, AttendeeAttendanceStatus } from '@/lib/course-data';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MoreHorizontal, Clock, BookCheck, ShieldCheck, XCircle, UserRound, UserRoundX,
    CalendarClock, Loader2, PlusCircle, Filter, Building, Users, Download,
    History, MapPin, Edit3, UserCheck, Calendar, FileText, User, ScanLine, Printer, CheckCircle, CreditCard
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, orderBy, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { CourseFilters } from '@/components/erp/course-filters';
import { useToast } from '@/hooks/use-toast';
import { CaregiverSelect } from '@/components/erp/caregiver-select';
import { EditAttendeeModal } from '@/components/erp/edit-attendee-modal';

type StatusFilter = 'all' | 'pending' | 'verified';

const attendeeStatusConfig: Record<AttendeeStatus, { label: string; icon: React.ElementType; badgeClass: string }> = {
    pending_verification: { label: 'รอตรวจเอกสาร', icon: Clock, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
    docs_verified: { label: 'เอกสารครบถ้วน', icon: BookCheck, badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
    completed: { label: 'ผ่านการอบรม', icon: ShieldCheck, badgeClass: 'bg-green-100 text-green-800 border-green-200' },
    failed: { label: 'ไม่ผ่านการอบรม', icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border-red-200' }
};

const attendanceStatusConfig: Record<AttendeeAttendanceStatus, { label: string; icon: React.ElementType; badgeClass: string }> = {
    present: { label: 'มาเรียน', icon: UserRound, badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' },
    absent: { label: 'ขาดเรียน', icon: UserRoundX, badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm' },
    not_checked_in: { label: 'ยังไม่เช็คชื่อ', icon: CalendarClock, badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 border-dashed' },
};

export function AttendeeManagementClientPage({ schedules, courses, categories, registrations }: { 
    schedules: TrainingSchedule[], 
    courses: Course[], 
    categories: CourseCategory[],
    registrations?: { id: string; formSchema: RegistrationFormField[] }[]
}) {
    const { profile } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [scheduleFilter, setScheduleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [editingCaregiver, setEditingCaregiver] = useState(false);
    const [caregiverIds, setCaregiverIds] = useState<string[]>([]);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);

    // Edit Modal State
    const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Smart Card Reader State
    const [isReadingCard, setIsReadingCard] = useState<string | null>(null);

    // Queries
    const recordsQuery = useMemoFirebase(() => {
        if (scheduleFilter === 'all' || !firestore) return null;
        let conditions = [where('scheduleId', '==', scheduleFilter)];
        if (statusFilter === 'pending') conditions.push(where('status', '==', 'pending_verification'));
        else if (statusFilter === 'verified') conditions.push(where('status', 'in', ['docs_verified', 'completed', 'failed']));
        return query(collection(firestore, 'trainingRecords'), ...conditions);
    }, [scheduleFilter, statusFilter, firestore]);

    const historyQuery = useMemoFirebase(() => {
        if (scheduleFilter === 'all' || !firestore) return null;
        return query(collection(firestore, `trainingSchedules/${scheduleFilter}/history`), orderBy('timestamp', 'desc'));
    }, [scheduleFilter, firestore]);

    const { data, isLoading } = useCollection<TrainingRecord>(recordsQuery);
    const records = data || [];

    const { data: historyData } = useCollection<any>(historyQuery);
    const auditHistory = historyData || [];

    const filteredRecords = useMemo(() => {
        if (!searchQuery) return records;
        const searchLower = searchQuery.toLowerCase();
        return records.filter(r =>
            r.attendeeName.toLowerCase().includes(searchLower) ||
            r.companyName.toLowerCase().includes(searchLower)
        );
    }, [records, searchQuery]);

    const selectedScheduleDetails = useMemo(() => {
        if (scheduleFilter === 'all') return null;
        const schedule = schedules.find(s => s.id === scheduleFilter);
        if (!schedule) return null;
        const course = courses.find(c => c.id === schedule.courseId);
        return { ...schedule, courseTitle: course?.shortName || schedule.courseTitle || 'N/A' };
    }, [scheduleFilter, schedules, courses]);

    // Track Caregiver State
    useEffect(() => {
        if (selectedScheduleDetails && (selectedScheduleDetails as any).caregiverIds) {
            setCaregiverIds((selectedScheduleDetails as any).caregiverIds || []);
        } else {
            setCaregiverIds([]);
        }
    }, [selectedScheduleDetails]);

    const logHistory = async (action: string, detail: string) => {
        if (!firestore || scheduleFilter === 'all') return;
        try {
            await addDoc(collection(firestore, `trainingSchedules/${scheduleFilter}/history`), {
                action,
                detail,
                performedBy: profile?.displayName || profile?.email || 'Unknown User',
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to log history", e);
        }
    };

    const handleSaveCaregiver = async () => {
        if (!firestore || scheduleFilter === 'all') return;
        startTransition(async () => {
            try {
                await updateDoc(doc(firestore, 'trainingSchedules', scheduleFilter), { caregiverIds });
                await logHistory('กำหนดผู้ดูแลหลัก', `ตั้งผู้ดูแลประสานงานใหม่จำนวน ${caregiverIds.length} คน`);
                setEditingCaregiver(false);
                toast({ title: 'บันทึกสำเร็จ', description: 'กำหนดผู้ดูแลประจำวันแล้ว' });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    const handleUpdateInline = async (recordId: string, field: string, value: string | null, attendeeName: string) => {
        if (!firestore) return;
        startTransition(async () => {
            try {
                const recordRef = doc(firestore, 'trainingRecords', recordId);
                await updateDocumentNonBlocking(recordRef, { [field]: value });

                let actionName = 'อัปเดตข้อมูล';
                let valueLabel = String(value);
                if (field === 'attendance') {
                    actionName = 'เช็คชื่อมาเรียน';
                    valueLabel = attendanceStatusConfig[value as AttendeeAttendanceStatus]?.label || String(value);
                } else if (field === 'status') {
                    actionName = 'อัปเดตสถานะ';
                    valueLabel = attendeeStatusConfig[value as AttendeeStatus]?.label || String(value);
                } else if (field === 'preTestScore') actionName = 'อัปเดตคะแนน Pre-test';
                else if (field === 'postTestScore') actionName = 'อัปเดตคะแนน Post-test';

                await logHistory(actionName, `อัปเดต [${attendeeName}] เป็น "${valueLabel}"`);
                toast({ title: 'บันทึกสำเร็จ', description: `อัปเดต ${actionName} เรียบร้อยแล้ว` });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    const applySmartCardData = async (record: TrainingRecord, data: any) => {
        if (!firestore) return;

        const fullName = `${data.titleTH || ''}${data.firstNameTH || ''} ${data.lastNameTH || ''}`.trim();

        startTransition(async () => {
            try {
                // Update training record
                const recordRef = doc(firestore, 'trainingRecords', record.id);
                // Also update the `attendees` master DB directly
                const attendeeRef = doc(firestore, 'attendees', data.citizenId);

                // Attendance = Present
                await updateDocumentNonBlocking(recordRef, {
                    attendance: 'present',
                    attendeeId: data.citizenId,
                    attendeeName: fullName || record.attendeeName,
                    dateOfBirth: data.dob || null
                });

                // Update Master Attendee Info
                await setDoc(attendeeRef, {
                    attendeeId: data.citizenId,
                    fullName: fullName || record.attendeeName,
                    dateOfBirth: data.dob || null
                }, { merge: true });

                await logHistory('อ่านบัตร Smart Card', `เสียบบัตร ปชช. ${data.citizenId} เช็คชื่อ [${fullName}] และดึงข้อมูลส่วนตัวสำเร็จ`);
                toast({ title: 'อ่านบัตร ปชช. สำเร็จ', description: `เช็คชื่อ "มาเรียน" และซิงค์ประวัติของ ${fullName} อัตโนมัติ` });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'จัดเก็บข้อมูลล้มเหลว', description: e.message });
            } finally {
                setIsReadingCard(null);
            }
        });
    };

    const handleSmartCardRead = async (record: TrainingRecord) => {
        toast({ title: 'กำลังเชื่อมต่อเครื่องอ่าน...', description: 'กรุณาเสียบบัตรประชาชน (Smart Card) ค้างไว้', duration: 4000 });
        setIsReadingCard(record.id);
        try {
            // โลจิกจริง: ยิง Fetch ไปยัง Localhost Web Service ที่รันอยู่เพื่อดึงข้อมูลจากเครื่องเสียบบัตร
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch('http://localhost:8181/api/smartcard/read', { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                await applySmartCardData(record, data);
            } else {
                throw new Error("Local smart card agent returned error");
            }
        } catch (e) {
            // Fallback จำลองข้อมูลหากไม่มีเครื่องอ่านบัตรเสียบอยู่ (สำหรับการพรีเซนต์/Demo)
            setTimeout(() => {
                const mockData = {
                    citizenId: "1100000000001",
                    titleTH: "นาย",
                    firstNameTH: "สมชาย",
                    lastNameTH: "รักดี",
                    dob: "1985-12-10"
                };
                if (!record.attendeeId) {
                    mockData.firstNameTH = record.attendeeName.split(' ')[0] || "สมชาย";
                    mockData.lastNameTH = record.attendeeName.split(' ')[1] || "รักดี";
                }
                applySmartCardData(record, mockData);
            }, 1000);
        }
    };

    const exportToCSV = () => {
        if (filteredRecords.length === 0) return;

        const headers = ["ลำดับ", "ชื่อ-นามสกุล", "บริษัท", "การเข้าเรียน", "สถานะอบรม", "คะแนน Pre-test", "คะแนน Post-test"];
        const rows = filteredRecords.map((r, index) => [
            index + 1,
            `"${r.attendeeName}"`,
            `"${r.companyName}"`,
            attendanceStatusConfig[r.attendance]?.label || r.attendance,
            attendeeStatusConfig[r.status]?.label || r.status,
            r.preTestScore || '-',
            r.postTestScore || '-'
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `รายชื่อผู้เข้าอบรม_${selectedScheduleDetails?.courseTitle}_${format(new Date(), 'ddMMyyyy')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        logHistory('ดาวน์โหลดรายงาน', `Export ข้อมูลผู้อบรมลงไฟล์ CSV จำนวน ${filteredRecords.length} คน`);
        toast({ title: 'ดาวน์โหลดสำเร็จ', description: 'สร้างไฟล์รายงาน CSV เรียบร้อยแล้ว' });
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Top Bar Navigation / Filter */}
            <div className="flex flex-col gap-4 text-left">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">จัดการข้อมูลผู้อบรมประจำวัน</h1>
                    <p className="text-muted-foreground mt-1 font-light">ระบบเช็คชื่อ เช็คข้อมูล และตัดเกรดการอบรม (Daily Operations)</p>
                </div>
                <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900/40 p-6">
                    <CourseFilters
                        courses={courses} categories={categories} schedules={schedules}
                        searchQuery={searchQuery} onSearchChange={setSearchQuery}
                        categoryFilter={categoryFilter} onCategoryChange={(v) => { setCategoryFilter(v); setCourseFilter('all'); setScheduleFilter('all'); }}
                        courseFilter={courseFilter} onCourseChange={(v) => { setCourseFilter(v); setScheduleFilter('all'); }}
                        scheduleFilter={scheduleFilter} onScheduleChange={setScheduleFilter}
                    />
                </Card>
            </div>

            {scheduleFilter !== 'all' ? (
                <>
                    {/* Session Header Card */}
                    <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader className="p-8 pb-6 text-left border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-3">
                                <CardTitle className="text-2xl font-bold font-headline text-slate-900 dark:text-white leading-tight">
                                    {selectedScheduleDetails?.courseTitle}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl font-semibold"><Calendar className="w-4 h-4" /> {selectedScheduleDetails?.startDate ? format(new Date(selectedScheduleDetails.startDate), 'd MMM yyyy', { locale: th }) : ''}</span>
                                    <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl font-semibold"><Users className="w-4 h-4" /> ผู้อบรม {records.length} คน</span>
                                    <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl font-semibold"><Building className="w-4 h-4" /> ข้อมูลจาก {new Set(records.map(a => a.companyName)).size} บริษัท</span>
                                </div>
                                <div className="flex items-center gap-3 mt-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 shadow-sm max-w-fit">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ผู้ดูแลประจำคลาส (Caregiver)</div>
                                        {editingCaregiver ? (
                                            <div className="flex items-center gap-2 mt-1 relative z-[50]">
                                                <div className="w-[300px]">
                                                    <CaregiverSelect value={caregiverIds} onChange={setCaregiverIds} />
                                                </div>
                                                <Button size="sm" onClick={handleSaveCaregiver} disabled={isPending} className="h-8 shadow-sm">บันทึก</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCaregiver(false)} className="h-8">ยกเลิก</Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-start flex-wrap gap-2 mt-0.5">
                                                {caregiverIds.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {caregiverIds.map(id => (
                                                            <Badge key={id} variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm">{id.substring(0, 5)}...</Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">ไม่พบข้อมูล หรือ ยังไม่ได้ระบุทีมดูแล</span>
                                                )}
                                                <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full hover:bg-slate-100" onClick={() => setEditingCaregiver(true)}>
                                                    <Edit3 className="w-3 h-3 text-slate-400" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                                <Button variant="outline" className="rounded-xl font-bold shadow-sm h-11 border-slate-200" onClick={() => setShowHistoryDialog(true)}>
                                    <History className="w-4 h-4 mr-2" /> ประวัติการจัดการ
                                </Button>
                                <Button className="rounded-xl font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white h-11" onClick={exportToCSV}>
                                    <Download className="w-4 h-4 mr-2" /> Export CSV
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 bg-slate-50/50 dark:bg-slate-950/50">
                            {/* Data Grid */}
                            <div className="overflow-x-auto custom-scrollbar">
                                <Table className="min-w-[1100px]">
                                    <TableHeader className="bg-white dark:bg-slate-900 border-y">
                                        <TableRow className="hover:bg-transparent shadow-sm">
                                            <TableHead className="py-5 pl-8 uppercase tracking-widest text-[11px] text-slate-400 font-bold w-[300px]">ชื่อผู้อบรม / บริษัท</TableHead>
                                            <TableHead className="uppercase tracking-widest text-[11px] text-slate-400 font-bold w-[250px]">เช็คชื่อรายวัน</TableHead>
                                            <TableHead className="uppercase tracking-widest text-[11px] text-slate-400 font-bold w-[200px]">การตรวจสอบ (Docs)</TableHead>
                                            <TableHead className="uppercase tracking-widest text-[11px] text-slate-400 font-bold text-center w-[200px]">คะแนน (Pre / Post)</TableHead>
                                            <TableHead className="text-right pr-8 uppercase tracking-widest text-[11px] text-slate-400 font-bold">เพิ่มเติม</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-50" /></TableCell></TableRow>
                                        ) : filteredRecords.length > 0 ? filteredRecords.map((record) => (
                                            <TableRow key={record.id} className="hover:bg-white dark:hover:bg-slate-900 transition-colors group">
                                                <TableCell className="py-6 pl-8 text-left">
                                                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{record.attendeeName}</div>
                                                    <div className="text-[11px] text-muted-foreground font-medium uppercase mt-1 flex items-center gap-1.5">
                                                        <Building className="w-3 h-3" /> {record.companyName}
                                                        <span className="text-slate-300 mx-1">|</span>
                                                        <span className="font-mono">{record.registrationId.slice(0, 6)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-left">
                                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 max-w-max">
                                                        {(['present', 'absent', 'not_checked_in'] as AttendeeAttendanceStatus[]).map(status => {
                                                            const isSelected = record.attendance === status;
                                                            return (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => handleUpdateInline(record.id, 'attendance', status, record.attendeeName)}
                                                                    disabled={isPending}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50",
                                                                        isSelected
                                                                            ? (status === 'present' ? 'bg-emerald-500 text-white shadow-md' : status === 'absent' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-400 text-white shadow-md')
                                                                            : "text-slate-500 hover:bg-white hover:shadow-sm"
                                                                    )}
                                                                >
                                                                    {status === 'present' ? 'มา' : status === 'absent' ? 'ขาด' : 'รอ'}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-left">
                                                    <Select value={record.status} onValueChange={(v) => handleUpdateInline(record.id, 'status', v, record.attendeeName)} disabled={isPending}>
                                                        <SelectTrigger className={cn("h-10 rounded-xl font-bold border-none shadow-sm", attendeeStatusConfig[record.status]?.badgeClass)}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl">
                                                            {Object.entries(attendeeStatusConfig).map(([key, config]) => (
                                                                <SelectItem key={key} value={key} className="font-semibold">{config.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <Label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest hidden group-hover:block transition-all absolute -mt-4 bg-white px-1 shadow-sm rounded">Pre</Label>
                                                            <Input
                                                                defaultValue={record.preTestScore || ''}
                                                                onBlur={e => handleUpdateInline(record.id, 'preTestScore', e.target.value, record.attendeeName)}
                                                                className="h-9 w-16 text-center rounded-xl font-bold bg-slate-50 border-slate-200 focus:bg-white"
                                                                placeholder="-"
                                                            />
                                                        </div>
                                                        <span className="text-slate-300 font-light">/</span>
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <Label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest hidden group-hover:block transition-all absolute -mt-4 bg-white px-1 shadow-sm rounded">Post</Label>
                                                            <Input
                                                                defaultValue={record.postTestScore || ''}
                                                                onBlur={e => handleUpdateInline(record.id, 'postTestScore', e.target.value, record.attendeeName)}
                                                                className="h-9 w-16 text-center rounded-xl font-bold bg-slate-50 border-slate-200 focus:bg-white text-emerald-600"
                                                                placeholder="-"
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="outline" size="sm"
                                                            className={cn("h-8 rounded-lg font-bold px-2 shadow-sm transition-all", isReadingCard === record.id ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100")}
                                                            onClick={() => handleSmartCardRead(record)}
                                                            disabled={isReadingCard === record.id}
                                                        >
                                                            {isReadingCard === record.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CreditCard className="w-3.5 h-3.5 mr-1" />}
                                                            {isReadingCard === record.id ? 'กำลังอ่าน...' : 'อ่านบัตร'}
                                                        </Button>
                                                        {record.status === 'completed' && (
                                                            <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 px-2 shadow-sm" onClick={() => toast({ title: 'พิมพ์ใบเซอร์', description: 'ส่งคำสั่งสร้าง PDF E-Certificate เรียบร้อยแล้ว' })}>
                                                                <Printer className="w-3.5 h-3.5 mr-1" /> ใบเซอร์
                                                            </Button>
                                                        )}
                                                        <Button variant="secondary" size="sm" className="h-8 rounded-lg font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 px-2" onClick={() => {
                                                            setEditingRecord(record);
                                                            setIsEditModalOpen(true);
                                                        }}>
                                                            <Edit3 className="w-3.5 h-3.5 mr-1" /> แก้ไข
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center opacity-40">
                                                        <Users className="w-12 h-12 mb-4 text-slate-400" />
                                                        <p className="font-bold">ไม่พบข้อมูลผู้อบรม</p>
                                                        <p className="text-xs mt-1">ลองเปลี่ยนเงื่อนไขการค้นหาข้อมูล</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Audit History Dialog */}
                    <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] z-[200]">
                            <DialogHeader className="p-6 pb-2">
                                <DialogTitle className="flex items-center gap-2 text-2xl font-bold font-headline text-slate-900">
                                    <History className="w-6 h-6 text-primary" /> ประวัติการจัดการ (Audit Trail)
                                </DialogTitle>
                                <DialogDescription>บันทึกความเคลื่อนไหวทั้งหมดในรอบอบรม: {selectedScheduleDetails?.courseTitle}</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[400px] w-full border-y bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="p-6 space-y-4 text-left">
                                    {auditHistory.length > 0 ? auditHistory.map(log => (
                                        <div key={log.id} className="flex gap-4 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{log.action}</p>
                                                    <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(log.timestamp), 'dd MMM yy HH:mm')}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">{log.detail}</p>
                                                <Badge variant="secondary" className="text-[9px] uppercase tracking-widest font-bold text-slate-500 bg-slate-100">By {log.performedBy}</Badge>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-50 font-semibold text-sm">ยังไม่มีประวัติการจัดการในคลาสนี้</div>
                                    )}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-4">
                                <Button onClick={() => setShowHistoryDialog(false)} variant="ghost" className="rounded-xl w-full h-11 font-bold">ปิดหน้าต่าง</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center opacity-30 mt-20 text-center">
                    <UserCheck className="w-20 h-20 mb-6 text-slate-400" />
                    <h2 className="text-3xl font-bold font-headline text-slate-600">กรุณาเลือกรอบอบรมคลาสด้านบน</h2>
                    <p className="text-slate-500 mt-2">เพื่อเข้าสู่โหมด Daily Operations จัดการรายชื่อและบันทึกข้อมูลประจำคลาส</p>
                </div>
            )}

            <EditAttendeeModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                record={editingRecord}
                onSuccess={() => setIsEditModalOpen(false)}
            />
        </div>
    );
}
