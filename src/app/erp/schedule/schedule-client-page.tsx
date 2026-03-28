'use client';

import React, { useState, useMemo, useEffect, useActionState, useTransition } from 'react';
import type { TrainingSchedule, Course, CourseCategory, Instructor, Client } from '@/lib/course-data';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    PlusCircle, Pencil, Trash2, Loader2, Calendar as CalendarIcon,
    CheckCircle, Clock, XCircle, MapPin, UserCircle, Copy, Check,
    Building2, Globe, RefreshCw, Link as LinkIcon, AlertTriangle
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { CourseFilters } from '@/components/erp/course-filters';
import { useToast } from '@/hooks/use-toast';
import { useFormStatus } from 'react-dom';
import { createSchedule, updateSchedule, deleteSchedule, generateInhouseToken, type FormState } from './actions';

const initialFormState: FormState = { message: '', success: undefined };

const statusConfig: Record<TrainingSchedule['status'], { label: string; className: string; icon: React.ElementType }> = {
    'เปิดรับสมัคร': { label: 'เปิดรับสมัคร', className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    'เต็ม': { label: 'เต็ม', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    'เร็วๆ นี้': { label: 'เร็วๆ นี้', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    'ยกเลิก': { label: 'ยกเลิก', className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400', icon: XCircle },
};

function formatDateRange(start: string, end: string) {
    if (!start) return '-';
    try {
        const startDate = parseISO(start);
        if (!end || start === end) return format(startDate, 'd MMM yy', { locale: th });
        return `${format(startDate, 'd')}-${format(parseISO(end), 'd MMM yy', { locale: th })}`;
    } catch { return '-'; }
}

function StatusBadge({ status }: { status: TrainingSchedule['status'] }) {
    const config = statusConfig[status] || statusConfig['ยกเลิก'];
    return (
        <Badge variant="outline" className={cn('gap-x-1.5 whitespace-nowrap font-bold px-2 py-0.5 rounded-lg text-[11px]', config.className)}>
            <config.icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}

function InhouseBadge() {
    return (
        <Badge className="bg-violet-100 text-violet-700 border border-violet-200 font-bold text-[10px] px-2 py-0.5 rounded-lg gap-1">
            <Building2 className="w-3 h-3" /> INHOUSE
        </Badge>
    );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="rounded-xl h-11 font-bold min-w-[120px]">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างรอบอบรม'}
        </Button>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="rounded-lg h-8 shrink-0 gap-1.5 font-bold text-xs">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
        </Button>
    );
}

export function ScheduleClientPage({ schedules: initialSchedules, courses, categories, clients }: {
    schedules: TrainingSchedule[];
    courses: Course[];
    categories: CourseCategory[];
    instructors: Instructor[];
    clients: Client[];
}) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isPending, startTransition] = useTransition();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);

    // Dialog state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [scheduleToEdit, setScheduleToEdit] = useState<TrainingSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<TrainingSchedule | null>(null);

    // Inhouse form state
    const [scheduleType, setScheduleType] = useState<'public' | 'inhouse'>('public');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientName, setClientName] = useState('');
    const [shownToken, setShownToken] = useState<string | undefined>();
    const [isResettingToken, setIsResettingToken] = useState(false);

    // Live Firestore
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'trainingSchedules'), orderBy('startDate', 'desc'));
    }, [firestore]);
    const { data } = useCollection<TrainingSchedule>(schedulesQuery);
    const liveSchedules = data || initialSchedules || [];
    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    // Server actions
    const [createState, createAction] = useActionState(createSchedule, initialFormState);
    const boundUpdate = updateSchedule.bind(null, scheduleToEdit?.id ?? '');
    const [updateState, updateAction] = useActionState(boundUpdate, initialFormState);

    const formState = scheduleToEdit ? updateState : createState;
    const formAction = scheduleToEdit ? updateAction : createAction;

    useEffect(() => {
        if (formState.success === undefined) return;
        if (formState.success) {
            toast({ title: 'สำเร็จ!', description: formState.message });
            if (formState.inhouseToken) {
                // Stay open to show the token
                setShownToken(formState.inhouseToken);
            } else {
                setIsFormOpen(false);
            }
        } else if (formState.message) {
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: formState.message });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formState]);

    const handleOpenCreate = () => {
        setScheduleToEdit(null);
        setScheduleType('public');
        setSelectedClientId('');
        setClientName('');
        setShownToken(undefined);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (s: TrainingSchedule) => {
        setScheduleToEdit(s);
        setScheduleType(s.scheduleType === 'inhouse' ? 'inhouse' : 'public');
        setSelectedClientId(s.clientId ?? '');
        setClientName(s.clientName ?? '');
        setShownToken(s.inhouseToken);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setShownToken(undefined);
    };

    const handleResetToken = () => {
        if (!scheduleToEdit) return;
        setIsResettingToken(true);
        startTransition(async () => {
            const result = await generateInhouseToken(scheduleToEdit.id);
            if (result.success && result.token) {
                setShownToken(result.token);
                toast({ title: 'สร้างลิงก์ใหม่แล้ว', description: 'ลิงก์เก่าใช้งานไม่ได้แล้ว' });
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            setIsResettingToken(false);
        });
    };

    const handleDeleteConfirm = () => {
        if (!scheduleToDelete) return;
        startTransition(async () => {
            const result = await deleteSchedule(scheduleToDelete.id);
            toast(result.success
                ? { title: 'ลบรอบอบรมแล้ว', description: result.message }
                : { variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message }
            );
            setIsDeleteOpen(false);
        });
    };

    // Filtering
    const filteredSchedules = useMemo(() => {
        return liveSchedules.filter(s => {
            const course = coursesMap.get(s.courseId);
            const matchesCategory = categoryFilter === 'all' || (course && course.categoryId === categoryFilter);
            const matchesCourse = courseFilter === 'all' || s.courseId === courseFilter;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || s.courseTitle.toLowerCase().includes(searchLower) || s.location.toLowerCase().includes(searchLower);
            return matchesCategory && matchesCourse && matchesSearch;
        });
    }, [liveSchedules, searchQuery, categoryFilter, courseFilter, coursesMap]);

    const scheduledDays = useMemo(() => {
        const days: Date[] = [];
        liveSchedules.forEach(s => { try { days.push(...eachDayOfInterval({ start: parseISO(s.startDate), end: parseISO(s.endDate) })); } catch {} });
        return days;
    }, [liveSchedules]);

    const inhouseUrl = typeof window !== 'undefined' && shownToken && scheduleToEdit
        ? `${window.location.origin}/inhouse/${scheduleToEdit.id}?token=${shownToken}`
        : shownToken && scheduleToEdit
        ? `/inhouse/${scheduleToEdit.id}?token=${shownToken}`
        : '';

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-end">
                <Button size="lg" className="rounded-2xl h-14 px-8 shadow-xl font-bold" onClick={handleOpenCreate}>
                    <PlusCircle className="mr-2 h-5 w-5" /> เพิ่มรอบใหม่
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950">
                        <CardHeader className="bg-muted/30 border-b pb-8">
                            <CourseFilters
                                courses={courses}
                                categories={categories}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                categoryFilter={categoryFilter}
                                onCategoryChange={setCategoryFilter}
                                courseFilter={courseFilter}
                                onCourseChange={setCourseFilter}
                            />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow>
                                            <TableHead className="font-bold py-4">หลักสูตร / วันที่</TableHead>
                                            <TableHead className="font-bold">สถานที่ / วิทยากร</TableHead>
                                            <TableHead className="font-bold text-center">ประเภท / สถานะ</TableHead>
                                            <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSchedules.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">ไม่พบรอบอบรม</TableCell></TableRow>
                                        )}
                                        {filteredSchedules.map((s) => (
                                            <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                                                <TableCell className="py-6 text-left font-bold">
                                                    {coursesMap.get(s.courseId)?.shortName || s.courseTitle}
                                                    <div className="text-[10px] text-muted-foreground font-medium uppercase mt-1 flex items-center gap-1.5">
                                                        <CalendarIcon className="w-3.5 h-3.5" />{formatDateRange(s.startDate, s.endDate)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-left font-medium text-sm text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{s.location}</div>
                                                    <div className="flex items-center gap-1.5 mt-1 opacity-70"><UserCircle className="w-3.5 h-3.5" />{s.instructorName || '-'}</div>
                                                    {s.scheduleType === 'inhouse' && (s.clientId || s.clientName) && (
                                                        <div className="flex items-center gap-1.5 mt-1 text-violet-600 dark:text-violet-400 font-semibold">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            {s.clientId ? (clients.find(c => c.id === s.clientId)?.companyName ?? s.clientName) : s.clientName}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {s.scheduleType === 'inhouse' ? <InhouseBadge /> : (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] px-2 gap-1">
                                                                <Globe className="w-3 h-3" /> PUBLIC
                                                            </Badge>
                                                        )}
                                                        <StatusBadge status={s.status} />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => handleOpenEdit(s)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => { setScheduleToDelete(s); setIsDeleteOpen(true); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950">
                        <CardHeader className="bg-primary text-white p-8"><CardTitle className="text-xl font-bold font-headline">Training Calendar</CardTitle></CardHeader>
                        <CardContent className="p-6 flex justify-center">
                            <Calendar mode="range" selected={dateFilter} onSelect={setDateFilter}
                                modifiers={{ scheduled: scheduledDays }}
                                modifiersStyles={{ scheduled: { fontWeight: '700', color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary)/0.1)', borderRadius: '8px' } }}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Create / Edit Dialog ── */}
            <Dialog open={isFormOpen} onOpenChange={(o) => { if (!o) handleCloseForm(); }}>
                <DialogContent className="sm:max-w-[580px] rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="px-7 py-6 border-b shrink-0">
                        <DialogTitle className="text-xl font-bold font-headline">
                            {scheduleToEdit ? 'แก้ไขรอบอบรม' : 'เพิ่มรอบอบรมใหม่'}
                        </DialogTitle>
                        <DialogDescription>
                            {scheduleToEdit ? `แก้ไขข้อมูล: ${scheduleToEdit.courseTitle}` : 'กรอกข้อมูลรอบอบรมใหม่'}
                        </DialogDescription>
                    </DialogHeader>

                    <form key={scheduleToEdit?.id ?? 'create'} action={formAction} className="flex-1 min-h-0 overflow-y-auto">
                        <div className="p-7 space-y-5">

                            {/* Schedule Type Toggle */}
                            <div className="space-y-2">
                                <Label className="font-bold text-sm">ประเภทรอบอบรม</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="hidden" name="scheduleType" value={scheduleType} />
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('public')}
                                        className={cn(
                                            'flex items-center gap-2.5 p-4 rounded-2xl border-2 text-left transition-all',
                                            scheduleType === 'public'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        )}
                                    >
                                        <Globe className="w-5 h-5 shrink-0" />
                                        <div>
                                            <p className="font-bold text-sm">สาธารณะ</p>
                                            <p className="text-[10px] opacity-60 mt-0.5">แสดงบนเว็บไซต์</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('inhouse')}
                                        className={cn(
                                            'flex items-center gap-2.5 p-4 rounded-2xl border-2 text-left transition-all',
                                            scheduleType === 'inhouse'
                                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        )}
                                    >
                                        <Building2 className="w-5 h-5 shrink-0" />
                                        <div>
                                            <p className="font-bold text-sm">Inhouse</p>
                                            <p className="text-[10px] opacity-60 mt-0.5">ไม่แสดงในเว็บ</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Course */}
                            <div className="space-y-1.5">
                                <Label htmlFor="courseId" className="font-bold text-sm">หลักสูตร *</Label>
                                <Select name="courseId" defaultValue={scheduleToEdit?.courseId ?? ''} required>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="เลือกหลักสูตร..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.shortName || c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formState.errors?.courseId && <p className="text-xs text-destructive">{formState.errors.courseId[0]}</p>}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="startDate" className="font-bold text-sm">วันเริ่มต้น *</Label>
                                    <Input id="startDate" name="startDate" type="date" defaultValue={scheduleToEdit?.startDate ?? ''} required className="rounded-xl h-11" />
                                    {formState.errors?.startDate && <p className="text-xs text-destructive">{formState.errors.startDate[0]}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="endDate" className="font-bold text-sm">วันสิ้นสุด *</Label>
                                    <Input id="endDate" name="endDate" type="date" defaultValue={scheduleToEdit?.endDate ?? ''} required className="rounded-xl h-11" />
                                    {formState.errors?.endDate && <p className="text-xs text-destructive">{formState.errors.endDate[0]}</p>}
                                </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-1.5">
                                <Label htmlFor="location" className="font-bold text-sm">สถานที่ *</Label>
                                <Input id="location" name="location" defaultValue={scheduleToEdit?.location ?? ''} required placeholder="เช่น โรงแรม ABC กรุงเทพฯ" className="rounded-xl h-11" />
                                {formState.errors?.location && <p className="text-xs text-destructive">{formState.errors.location[0]}</p>}
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <Label htmlFor="status" className="font-bold text-sm">สถานะ *</Label>
                                <Select name="status" defaultValue={scheduleToEdit?.status ?? 'เปิดรับสมัคร'} required>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(['เปิดรับสมัคร', 'เร็วๆ นี้', 'เต็ม', 'ยกเลิก'] as const).map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Instructor */}
                            <div className="space-y-1.5">
                                <Label htmlFor="instructorName" className="font-bold text-sm">วิทยากร</Label>
                                <Input id="instructorName" name="instructorName" defaultValue={scheduleToEdit?.instructorName ?? ''} placeholder="ชื่อวิทยากร (optional)" className="rounded-xl h-11" />
                            </div>

                            {/* Inhouse-only: Client + Link */}
                            {scheduleType === 'inhouse' && (
                                <div className="space-y-4 p-5 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                                    <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest">ตั้งค่า Inhouse</p>

                                    <div className="space-y-1.5">
                                        <Label className="font-bold text-sm">บริษัทลูกค้า</Label>
                                        <input type="hidden" name="clientId" value={selectedClientId} />
                                        <input type="hidden" name="clientName" value={clientName} />
                                        <Select value={selectedClientId || '__none__'} onValueChange={v => {
                                            setSelectedClientId(v === '__none__' ? '' : v);
                                            if (v !== '__none__') setClientName('');
                                        }}>
                                            <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-slate-900">
                                                <SelectValue placeholder="เลือกจากรายชื่อ..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">— พิมพ์ชื่อเอง —</SelectItem>
                                                {clients.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {/* Show text input when no existing client is selected */}
                                        {!selectedClientId && (
                                            <Input
                                                value={clientName}
                                                onChange={e => setClientName(e.target.value)}
                                                placeholder="พิมพ์ชื่อบริษัท / หน่วยงาน..."
                                                className="rounded-xl h-11 bg-white dark:bg-slate-900 mt-2"
                                            />
                                        )}
                                    </div>

                                    {/* Token / Link display — show after save or when editing */}
                                    {shownToken && scheduleToEdit && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                                                <LinkIcon className="w-3.5 h-3.5" /> ลิงก์สำหรับลูกค้ากรอกรายชื่อ
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-[11px] bg-white dark:bg-slate-900 border border-violet-200 rounded-lg px-3 py-2 truncate text-violet-800 dark:text-violet-300">
                                                    {inhouseUrl}
                                                </code>
                                                <CopyButton text={inhouseUrl} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] text-slate-500">รีเซ็ตลิงก์จะทำให้ลิงก์เก่าใช้งานไม่ได้</p>
                                                <Button type="button" variant="ghost" size="sm" onClick={handleResetToken}
                                                    disabled={isResettingToken || isPending}
                                                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                                                    {isResettingToken ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                    รีเซ็ตลิงก์
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {!shownToken && scheduleToEdit && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                            ยังไม่มีลิงก์ — บันทึกเพื่อสร้างลิงก์อัตโนมัติ
                                        </p>
                                    )}
                                    {!scheduleToEdit && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <LinkIcon className="w-3.5 h-3.5 text-violet-500" />
                                            ลิงก์สำหรับลูกค้าจะถูกสร้างหลังบันทึก
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Token display after CREATE success (scheduleToEdit is still null at this point) */}
                            {shownToken && !scheduleToEdit && (
                                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 space-y-3">
                                    <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> สร้างรอบอบรมแล้ว — นี่คือลิงก์ Inhouse
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-[11px] bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg px-3 py-2 truncate text-emerald-800">
                                            {`/inhouse/...?token=${shownToken}`}
                                        </code>
                                        <CopyButton text={shownToken} />
                                    </div>
                                    <p className="text-[10px] text-slate-500">เปิดรอบอีกครั้งเพื่อดู URL เต็ม</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="px-7 py-5 border-t shrink-0 bg-white dark:bg-slate-950 flex flex-col sm:flex-row gap-3">
                            <Button type="button" variant="ghost" className="rounded-xl h-11 font-bold" onClick={handleCloseForm}>ยกเลิก</Button>
                            <SubmitButton isEditing={!!scheduleToEdit} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ── */}
            <AlertDialog open={isDeleteOpen} onOpenChange={(o) => !o && setIsDeleteOpen(false)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบรอบอบรม?</AlertDialogTitle>
                        <AlertDialogDescription>
                            รอบ &quot;{scheduleToDelete?.courseTitle}&quot; ({formatDateRange(scheduleToDelete?.startDate ?? '', scheduleToDelete?.endDate ?? '')})
                            จะถูกลบถาวร ใบสมัครที่เกี่ยวข้องจะถูกยกเลิกและส่งอีเมลแจ้งผู้ลงทะเบียน
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ใช่, ลบเลย'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
