'use client';

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import type { Registration, Course, RegistrationStatus, CourseCategory, TrainingSchedule, IndividualAttendeeStatus, RegistrationFormField, RegistrationAttendee } from '@/lib/course-data';
import Link from 'next/link';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
    MoreHorizontal, Trash2, Loader2, CheckCircle, Clock, XCircle, Edit, Users, 
    UserCheck, CalendarPlus, Building, Calendar, FileText, FileSignature, Filter, 
    ExternalLink, GraduationCap, Info, MapPin, CreditCard, Printer, History, 
    AlertTriangle, DatabaseZap, User, Search, ChevronRight, CornerDownRight, RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    updateIndividualAttendeeStatus, deleteRegistration, createQuotationAction, 
    createInvoiceAction, rescheduleRegistrationAction, rescheduleIndividualAttendeesAction
} from './actions';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from '@/hooks/use-debounce';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CourseFilters } from '@/components/erp/course-filters';

const attendeeStatusConfig: Record<IndividualAttendeeStatus, { label: string; icon: React.ElementType; badgeClass: string; }> = {
  pending: { label: 'รออนุมัติ', icon: Clock, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'ยืนยันแล้ว', icon: CheckCircle, badgeClass: 'bg-green-100 text-green-800 border-green-200' },
  postponed: { label: 'เลื่อนรอบ', icon: CalendarPlus, badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  cancelled: { label: 'ยกเลิก', icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border-red-200' },
};

function AttendeeStatusBadge({ status }: { status: IndividualAttendeeStatus }) {
  const config = attendeeStatusConfig[status] || attendeeStatusConfig.pending;
  return (
    <Badge variant="outline" className={cn('gap-x-1.5 whitespace-nowrap px-2 py-0.5 font-semibold', config.badgeClass)}>
      <config.icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

function RescheduleDialog({ 
    registration, 
    attendeeIds,
    schedules, 
    isOpen, 
    onClose, 
    onSuccess 
}: { 
    registration: Registration | null, 
    attendeeIds?: string[], 
    schedules: TrainingSchedule[], 
    isOpen: boolean, 
    onClose: () => void, 
    onSuccess: () => void 
}) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

    const availableSchedules = useMemo(() => {
        if (!registration) return [];
        return schedules.filter(s => s.courseId === registration.courseId && s.id !== registration.scheduleId);
    }, [registration, schedules]);

    const handleConfirm = () => {
        if (!registration || !selectedScheduleId) return;
        startTransition(async () => {
            let result;
            if (attendeeIds && attendeeIds.length > 0) {
                result = await rescheduleIndividualAttendeesAction({
                    registrationId: registration.id,
                    attendeeIds,
                    newScheduleId: selectedScheduleId
                });
            } else {
                result = await rescheduleRegistrationAction(registration.id, selectedScheduleId);
            }

            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
                onSuccess();
                onClose();
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-[2rem] z-[200]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-bold">
                        <History className="text-primary"/> เลื่อนรอบการอบรม
                    </DialogTitle>
                    <DialogDescription>
                        {attendeeIds && attendeeIds.length > 0 
                            ? `ย้ายผู้อบรมที่เลือกจำนวน ${attendeeIds.length} ท่านไปยังรอบใหม่`
                            : `เลือกปี/เดือน/รอบ ที่ต้องการย้ายใบสมัครของ ${registration?.clientCompanyName || 'ผู้อบรมท่านนี้'} ไป`
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <Label className="font-semibold">เลือกรอบอบรมใหม่ (เฉพาะหลักสูตรเดียวกัน)</Label>
                    <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="ค้นหารอบอบรมที่เปิดอยู่..." />
                        </SelectTrigger>
                        <SelectContent className="z-[210]">
                            {availableSchedules.length > 0 ? availableSchedules.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    {format(new Date(s.startDate), 'd MMM yy', {locale: th})} - {s.location}
                                </SelectItem>
                            )) : (
                                <div className="p-4 text-center text-xs text-muted-foreground">ไม่พบรอบอบรมอื่นที่เปิดอยู่</div>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl">ยกเลิก</Button>
                    <Button onClick={handleConfirm} disabled={!selectedScheduleId || isPending} className="rounded-xl font-bold h-11 px-6">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        ยืนยันการย้ายรอบ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function RegistrationsClientPage({ courses, categories, schedules }: { courses: Course[], categories: CourseCategory[], schedules: TrainingSchedule[] }) {
    const { toast } = useToast();
    const [isActionPending, startTransition] = useTransition();
    const firestore = useFirestore();

    const [activeTab, setActiveTab] = useState<RegistrationStatus>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [scheduleFilter, setScheduleFilter] = useState('all');
    const [dateRange, setDateRange] = useState<{from?: Date, to?: Date} | undefined>(undefined);
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
    const [reschedulingRegistration, setReschedulingRegistration] = useState<Registration | null>(null);
    const [rescheduleAttendeeIds, setRescheduleAttendeeIds] = useState<string[]>([]);
    const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);

    // Dynamic Attendees selection for the active Registration Detail View
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());

    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
    const schedulesMap = useMemo(() => new Map(schedules.map(s => [s.id, s])), [schedules]);

    const registrationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let conditions: any[] = [where('status', '==', activeTab)];
        if (courseFilter !== 'all') conditions.push(where('courseId', '==', courseFilter));
        if (scheduleFilter !== 'all') conditions.push(where('scheduleId', '==', scheduleFilter));
        return query(collection(firestore, 'registrations'), ...conditions, orderBy('registrationDate', 'desc'));
    }, [firestore, activeTab, courseFilter, scheduleFilter]);

    const { data, isLoading } = useCollection<Registration>(registrationsQuery);
    const liveRegistrations = data || [];

    const handleAction = (action: (id: string) => Promise<any>, id: string) => {
        setProcessingId(id);
        startTransition(async () => {
            const result = await action(id);
            if (result.success) toast({ title: 'สำเร็จ!', description: result.message });
            else toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            setProcessingId(null);
        });
    };

    const handleUpdateAttendeesStatus = (registration: Registration, attendeeIds: string[], newStatus: IndividualAttendeeStatus) => {
        const attendeeListField = registration.formSchema.find(f => f.type === 'attendee_list');
        if (!attendeeListField) return;

        setProcessingId(registration.id);
        startTransition(async () => {
            const result = await updateIndividualAttendeeStatus({
                registrationId: registration.id,
                attendeeListFieldId: attendeeListField.id,
                attendeeIds,
                newStatus,
            });
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
                setSelectedAttendeeIds(new Set());
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            setProcessingId(null);
        });
    };

    const filteredRegistrations = useMemo(() => {
        return liveRegistrations.filter(reg => {
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch = !debouncedSearch || 
                (reg.clientCompanyName || '').toLowerCase().includes(searchLower) ||
                (reg.userDisplayName || '').toLowerCase().includes(searchLower) ||
                reg.courseTitle.toLowerCase().includes(searchLower);

            let matchesDate = true;
            if (dateRange?.from && dateRange?.to) {
                const regDate = new Date(reg.registrationDate);
                matchesDate = regDate >= dateRange.from && regDate <= dateRange.to;
            }
            return matchesSearch && matchesDate;
        });
    }, [liveRegistrations, debouncedSearch, dateRange]);

    const selectedRegistration = useMemo(() => {
        return filteredRegistrations.find(r => r.id === selectedRegistrationId) || null;
    }, [selectedRegistrationId, filteredRegistrations]);

    // Cleanup attendee selection when changing active registration
    useEffect(() => {
        setSelectedAttendeeIds(new Set());
    }, [selectedRegistrationId]);


    // Component to intelligently render deep form data
    const renderFormFieldValue = (field: RegistrationFormField, reg: Registration) => {
        const value = reg.formData[field.id];
        if ((value == null || value === '') && field.type !== 'header' && field.type !== 'page_break') return null;

        switch (field.type) {
            case 'header':
                return (
                    <div className="mt-8 mb-4 border-l-4 border-primary pl-4" key={field.id}>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">{field.label}</h4>
                        {field.description && <p className="text-xs text-muted-foreground mt-1 font-light">{field.description}</p>}
                    </div>
                );
            case 'coordinator':
                return (
                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="text-left"><Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">ผู้ประสานงาน</Label><p className="font-semibold text-sm mt-1">{value?.name || '-'}</p></div>
                        <div className="text-left"><Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">เบอร์โทร</Label><p className="font-semibold text-sm mt-1">{value?.tel || '-'}</p></div>
                        <div className="text-left"><Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">อีเมล</Label><p className="font-semibold text-sm mt-1 break-all">{value?.email || '-'}</p></div>
                    </div>
                );
            case 'address':
                const billing = value?.billingAddress || {};
                const shipping = value?.isShippingSameAsBilling ? billing : (value?.shippingAddress || {});
                return (
                    <div key={field.id} className="grid md:grid-cols-2 gap-6 mt-4 text-left">
                        <div className="space-y-3">
                            <Label className="font-bold text-[10px] uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5"/> ที่อยู่ออกใบกำกับภาษี
                            </Label>
                            <div className="text-sm bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm leading-relaxed min-h-[100px]">
                                <p className="font-semibold text-slate-900 dark:text-white">{billing.address1 || '-'}</p>
                                <p className="text-slate-600 dark:text-slate-400 font-light">
                                    {billing.subdistrict ? `ต.${billing.subdistrict} ` : ''}
                                    {billing.district ? `อ.${billing.district} ` : ''}
                                    {billing.province ? `จ.${billing.province} ` : ''}
                                    {billing.postalCode || ''}
                                </p>
                                {billing.taxId && (
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        เลขประจำตัวผู้เสียภาษี: <span className="font-semibold text-slate-700 dark:text-slate-300">{billing.taxId}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-bold text-[10px] uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5"/> ที่อยู่จัดส่งเอกสาร
                            </Label>
                            <div className="text-sm bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm leading-relaxed min-h-[100px]">
                                {value?.isShippingSameAsBilling ? (
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground italic h-full py-2 opacity-60">
                                        <CheckCircle className="w-6 h-6 text-emerald-500 mb-1"/>
                                        <span className="text-xs">ใช้ที่อยู่เดียวกับใบเสร็จ</span>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-semibold text-slate-900 dark:text-white">{shipping.address1 || '-'}</p>
                                        <p className="text-slate-600 dark:text-slate-400 font-light">
                                            {shipping.subdistrict ? `ต.${shipping.subdistrict} ` : ''} 
                                            {shipping.district ? `อ.${shipping.district} ` : ''} 
                                            {shipping.province ? `จ.${shipping.province} ` : ''} 
                                            {shipping.postalCode || ''}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'attendee_list':
                // We will skip attendee_list here because it's managed in the main Attendees Tab.
                return null;
            case 'select':
            case 'radio': {
                const selectedOption = field.options?.find((o: { value: string; label: string }) => o.value === value);
                const displayLabel = selectedOption?.label || String(value || '-');
                return (
                    <div className="py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-none text-left" key={field.id}>
                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{field.label}</Label>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mt-1">{displayLabel}</p>
                    </div>
                );
            }
            case 'file':
                return (
                    <div className="py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-none text-left" key={field.id}>
                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{field.label}</Label>
                        <a href={String(value)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-1 font-medium">
                            <FileText className="w-4 h-4 shrink-0" />
                            ดูไฟล์แนบ
                        </a>
                    </div>
                );
            default:
                if (field.type === 'page_break') return <Separator key={field.id} className="my-8" />;
                return (
                    <div className="py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-none text-left" key={field.id}>
                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{field.label}</Label>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mt-1">{String(value ?? '-')}</p>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Top Bar Filters */}
            <div className="flex flex-col gap-4 text-left">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">จัดการข้อมูลลงทะเบียน</h1>
                    <p className="text-muted-foreground mt-1 font-light">มุมมองแบบ Inbox Master-Detail รองรับข้อมูลมหาศาล</p>
                </div>
                <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900/40 p-6">
                    <CourseFilters 
                        courses={courses} categories={categories} schedules={schedules}
                        searchQuery={searchQuery} onSearchChange={setSearchQuery}
                        categoryFilter={categoryFilter} onCategoryChange={(v) => {setCategoryFilter(v); setCourseFilter('all'); setScheduleFilter('all');}}
                        courseFilter={courseFilter} onCourseChange={(v) => {setCourseFilter(v); setScheduleFilter('all');}}
                        scheduleFilter={scheduleFilter} onScheduleChange={setScheduleFilter}
                        dateRange={dateRange as any} onDateRangeChange={(v) => setDateRange(v as any)}
                    />
                </Card>
            </div>

            {/* Master-Detail Split Pane */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[85vh] min-h-[700px]">
                
                {/* ---------- LEFT PANE: MASTER LIST ---------- */}
                <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 shadow-xl rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b">
                        <Tabs value={activeTab} onValueChange={v => {setActiveTab(v as RegistrationStatus); setSelectedRegistrationId(null);}} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                                <TabsTrigger value="pending" className="rounded-xl font-bold text-xs">รอรับรอง</TabsTrigger>
                                <TabsTrigger value="confirmed" className="rounded-xl font-bold text-xs">ยืนยันแล้ว</TabsTrigger>
                                <TabsTrigger value="cancelled" className="rounded-xl font-bold text-xs">ยกเลิก</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50"/>
                            </div>
                        ) : filteredRegistrations.length > 0 ? (
                            filteredRegistrations.map(reg => {
                                const schedule = schedulesMap.get(reg.scheduleId);
                                const isSelected = reg.id === selectedRegistrationId;
                                const attendeeCount = Object.values(reg.formData).find(v => Array.isArray(v))?.length || 0;
                                return (
                                    <div 
                                        key={reg.id} 
                                        onClick={() => setSelectedRegistrationId(reg.id)}
                                        className={cn(
                                            "p-4 rounded-2xl cursor-pointer transition-all border text-left flex flex-col gap-2 relative group",
                                            isSelected 
                                                ? "bg-slate-900 text-white border-transparent shadow-md ring-2 ring-primary ring-offset-2 dark:bg-primary dark:text-primary-foreground" 
                                                : "bg-white text-slate-900 hover:bg-slate-50 border-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-100"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-[15px] truncate max-w-[85%]">{reg.clientCompanyName || reg.userDisplayName}</div>
                                            <AttendeeStatusBadge status={reg.status === 'cancelled' ? 'cancelled' : reg.status === 'confirmed' ? 'confirmed' : 'pending'} />
                                        </div>
                                        <div className={cn("text-xs font-semibold truncate", isSelected ? "text-slate-300 dark:text-slate-100/80" : "text-primary")}>
                                            {coursesMap.get(reg.courseId)?.shortName || reg.courseTitle}
                                        </div>
                                        <div className={cn("text-[11px] flex justify-between items-end mt-1", isSelected ? "text-slate-400 dark:text-slate-200" : "text-slate-500")}>
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3"/> {schedule ? format(new Date(schedule.startDate), 'd MMM yy', {locale: th}) : 'N/A'}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold flex items-center gap-1"><Users className="w-3 h-3"/> {attendeeCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 p-6 text-center">
                                <DatabaseZap className="w-12 h-12 mb-4 text-slate-400" />
                                <p className="font-bold">ไม่พบข้อมูลการลงทะเบียน</p>
                                <p className="text-xs mt-1">ลองเปลี่ยนเงื่อนไขการค้นหาข้อมูล</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ---------- RIGHT PANE: DETAIL VIEW ---------- */}
                <div className="lg:col-span-8 flex flex-col bg-slate-50/50 dark:bg-slate-900 shadow-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                    {!selectedRegistration ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none p-10 text-center">
                            <CornerDownRight className="w-20 h-20 mb-6 text-slate-400" />
                            <h2 className="text-3xl font-bold font-headline text-slate-600">กรุณาเลือกรายการทางด้านซ้าย</h2>
                            <p className="text-slate-500 mt-2">เพื่อดูข้อมูลใบสมัคร ดำเนินการยืนยันผู้อบรม หรือออกเอกสารทางการเงิน</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950">
                            {/* DETAIL HEADER */}
                            <div className="p-8 pb-6 border-b bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col gap-6">
                                <div className="flex justify-between items-start gap-4 text-left">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                                {selectedRegistration.clientCompanyName || selectedRegistration.userDisplayName}
                                            </h2>
                                            <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground uppercase">ID: {selectedRegistration.id.slice(0, 8)}</Badge>
                                        </div>
                                        <p className="text-sm font-semibold text-primary">{selectedRegistration.courseTitle}</p>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5"/> 
                                            {schedulesMap.get(selectedRegistration.scheduleId)?.location || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="rounded-xl h-10 shadow-sm font-bold" onClick={() => handleAction(createQuotationAction, selectedRegistration.id)} disabled={processingId === selectedRegistration.id}>
                                            <FileText className="w-4 h-4 mr-2"/> ออกใบเสนอราคา
                                        </Button>
                                        <Button size="sm" variant="outline" className="rounded-xl h-10 shadow-sm font-bold" onClick={() => handleAction(createInvoiceAction, selectedRegistration.id)} disabled={processingId === selectedRegistration.id}>
                                            <FileSignature className="w-4 h-4 mr-2"/> ออกใบแจ้งหนี้
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="rounded-xl h-10 w-10 shadow-sm"><MoreHorizontal className="w-4 h-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-2xl p-2 w-48">
                                                <DropdownMenuItem asChild className="rounded-xl font-semibold"><Link href={`/erp/registrations/edit/${selectedRegistration.id}`}><Edit className="w-4 h-4 mr-2"/> แก้ไขใบสมัคร</Link></DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl font-semibold" onClick={() => setReschedulingRegistration(selectedRegistration)}><History className="w-4 h-4 mr-2"/> เลื่อนรอบยกแก๊ง</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="rounded-xl font-semibold text-destructive" onClick={() => setRegistrationToDelete(selectedRegistration)}><Trash2 className="w-4 h-4 mr-2"/> ลบใบสมัครนี้</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>

                            {/* DETAIL CONTENT TABS */}
                            <Tabs defaultValue="attendees" className="flex flex-col flex-1 overflow-hidden">
                                <div className="px-8 border-b">
                                    <TabsList className="bg-transparent h-12 p-0 flex space-x-6 justify-start">
                                        <TabsTrigger value="attendees" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold data-[state=active]:text-primary">รายชื่อผู้อบรม</TabsTrigger>
                                        <TabsTrigger value="formdata" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold data-[state=active]:text-primary">ข้อมูลฟอร์มต้นฉบับ</TabsTrigger>
                                        <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold data-[state=active]:text-primary">เอกสารอ้างอิง</TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* ATTENDEES TAB */}
                                <TabsContent value="attendees" className="flex-1 overflow-y-auto custom-scrollbar p-8 mt-0 outline-none">
                                    {(() => {
                                        const attendeeListField = selectedRegistration.formSchema.find(f => f.type === 'attendee_list');
                                        const attendees = attendeeListField ? (selectedRegistration.formData[attendeeListField.id] || []) as RegistrationAttendee[] : [];
                                        const pendingCount = attendees.filter(a => a.status === 'pending').length;
                                        const confirmedCount = attendees.filter(a => a.status === 'confirmed').length;
                                        const postponedCount = attendees.filter(a => a.status === 'postponed').length;
                                        const cancelledCount = attendees.filter(a => a.status === 'cancelled').length;
                                        const fullNameFieldId = attendeeListField?.subFields?.find(sf => sf.label.includes("ชื่อ"))?.id;

                                        return (
                                            <>
                                                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                                                    <div>
                                                        <h3 className="text-xl font-bold font-headline flex items-center gap-2"><Users className="w-5 h-5 text-primary"/> จัดการสถานะผู้อบรม</h3>
                                                        {attendees.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {pendingCount > 0 && <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{pendingCount} รออนุมัติ</span>}
                                                                {confirmedCount > 0 && <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">{confirmedCount} ยืนยันแล้ว</span>}
                                                                {postponedCount > 0 && <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{postponedCount} เลื่อนรอบ</span>}
                                                                {cancelledCount > 0 && <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">{cancelledCount} ยกเลิก</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {pendingCount > 0 && (
                                                            <Button size="sm" className="h-9 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-sm" onClick={() => handleUpdateAttendeesStatus(selectedRegistration, attendees.filter(a => a.status === 'pending').map(a => a.id), 'confirmed')} disabled={processingId === selectedRegistration.id}>
                                                                <CheckCircle className="w-3.5 h-3.5 mr-1.5"/>อนุมัติทั้งหมด ({pendingCount} คน)
                                                            </Button>
                                                        )}
                                                        {selectedAttendeeIds.size > 0 && (
                                                            <>
                                                                <Button size="sm" variant="outline" className="h-9 rounded-xl font-bold text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleUpdateAttendeesStatus(selectedRegistration, Array.from(selectedAttendeeIds), 'confirmed')} disabled={processingId === selectedRegistration.id}>อนุมัติที่เลือก ({selectedAttendeeIds.size})</Button>
                                                                <Button size="sm" variant="outline" className="h-9 rounded-xl font-bold text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleUpdateAttendeesStatus(selectedRegistration, Array.from(selectedAttendeeIds), 'pending')} disabled={processingId === selectedRegistration.id}>
                                                                    <RotateCcw className="w-3.5 h-3.5 mr-1"/>คืนสู่รออนุมัติ
                                                                </Button>
                                                                <Button size="sm" variant="outline" className="h-9 rounded-xl font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { setRescheduleAttendeeIds(Array.from(selectedAttendeeIds)); setReschedulingRegistration(selectedRegistration); }}>เลื่อนรอบที่เลือก ({selectedAttendeeIds.size})</Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="border rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50 dark:bg-slate-950/50">
                                                            <TableRow>
                                                                <TableHead className="w-[50px] text-center"><Checkbox onCheckedChange={(c) => {
                                                                    if (c) setSelectedAttendeeIds(new Set(attendees.map(a => a.id)));
                                                                    else setSelectedAttendeeIds(new Set());
                                                                }}/></TableHead>
                                                                <TableHead className="font-bold">ชื่อ-นามสกุล / รหัสบัตร</TableHead>
                                                                <TableHead className="font-bold">สถานะ</TableHead>
                                                                <TableHead className="text-right pr-6 font-bold">ดำเนินการรายบุคคล</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {attendees.length === 0 ? (
                                                                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">ยังไม่มีรายชื่อผู้อบรม</TableCell></TableRow>
                                                            ) : attendees.map(attendee => (
                                                                <TableRow key={attendee.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedAttendeeIds.has(attendee.id) ? 'bg-indigo-50/50' : '')}>
                                                                    <TableCell className="text-center">
                                                                        <Checkbox
                                                                            checked={selectedAttendeeIds.has(attendee.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                const newSet = new Set(selectedAttendeeIds);
                                                                                if (checked) newSet.add(attendee.id);
                                                                                else newSet.delete(attendee.id);
                                                                                setSelectedAttendeeIds(newSet);
                                                                            }}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-left py-4">
                                                                        <div className="font-bold text-sm">{fullNameFieldId ? attendee[fullNameFieldId] : 'ผู้อบรม'}</div>
                                                                        <div className="text-xs text-muted-foreground mt-0.5 opacity-70">รหัสบัตร: {attendee.attendeeId || '-'}</div>
                                                                    </TableCell>
                                                                    <TableCell className="text-left"><AttendeeStatusBadge status={attendee.status} /></TableCell>
                                                                    <TableCell className="text-right pr-6">
                                                                        <div className="flex justify-end gap-1">
                                                                            {attendee.status !== 'confirmed' && (
                                                                                <Button variant="ghost" size="sm" onClick={() => handleUpdateAttendeesStatus(selectedRegistration, [attendee.id], 'confirmed')} disabled={processingId === selectedRegistration.id} className="font-bold text-xs h-8 px-3 rounded-lg hover:bg-green-50 hover:text-green-700">อนุมัติ</Button>
                                                                            )}
                                                                            {attendee.status === 'confirmed' && (
                                                                                <Button variant="ghost" size="sm" onClick={() => handleUpdateAttendeesStatus(selectedRegistration, [attendee.id], 'pending')} disabled={processingId === selectedRegistration.id} className="font-bold text-xs h-8 px-3 rounded-lg hover:bg-amber-50 hover:text-amber-700">
                                                                                    <RotateCcw className="w-3 h-3 mr-1"/>คืนรออนุมัติ
                                                                                </Button>
                                                                            )}
                                                                            <Button variant="ghost" size="sm" onClick={() => { setRescheduleAttendeeIds([attendee.id]); setReschedulingRegistration(selectedRegistration); }} className="font-bold text-xs h-8 px-3 rounded-lg hover:bg-blue-50 hover:text-blue-700">เลื่อนรอบ</Button>
                                                                            {attendee.status !== 'cancelled' && (
                                                                                <Button variant="ghost" size="sm" onClick={() => handleUpdateAttendeesStatus(selectedRegistration, [attendee.id], 'cancelled')} disabled={processingId === selectedRegistration.id} className="font-bold text-xs h-8 px-3 rounded-lg hover:bg-red-50 hover:text-red-700">ยกเลิก</Button>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </TabsContent>

                                {/* FORM DATA TAB */}
                                <TabsContent value="formdata" className="flex-1 overflow-y-auto custom-scrollbar p-8 mt-0 outline-none">
                                    <div className="max-w-3xl space-y-4 pb-10">
                                        <Alert className="mb-8 rounded-2xl bg-blue-50/50 text-blue-800 border-blue-100 flex items-start gap-4 p-4">
                                            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                            <div>
                                                <AlertTitle className="font-bold">ข้อมูลต้นฉบับ 100%</AlertTitle>
                                                <AlertDescription className="text-xs font-light mt-1">
                                                    นี่คือข้อมูลดิบแบบละเอียดที่ลูกค้ากรอกมาในระบบหน้าเว็บทั้งหมด คุณสามารถดูข้อมูลที่ไม่มีในตารางได้จากหน้านี้
                                                </AlertDescription>
                                            </div>
                                        </Alert>
                                        {selectedRegistration.formSchema.map(field => renderFormFieldValue(field, selectedRegistration))}
                                    </div>
                                </TabsContent>

                                {/* DOCUMENTS TAB */}
                                <TabsContent value="documents" className="flex-1 overflow-y-auto custom-scrollbar p-8 mt-0 outline-none">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                                        <Card className="rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500"/> ข้อมูล Quotation</CardTitle>
                                                <CardDescription>ใบเสนอราคาที่ออกโดยระบบ</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {selectedRegistration.quotationGenerated ? (
                                                    <div className="space-y-4">
                                                        <Alert className="bg-green-50 border-green-200 text-green-800 rounded-xl">
                                                            <CheckCircle className="w-4 h-4 text-green-600"/>
                                                            <AlertTitle className="font-bold">สร้างเอกสารแล้ว</AlertTitle>
                                                            <AlertDescription className="text-xs mt-1">ระบบได้ทำการสร้างใบเสนอราคา ID: {selectedRegistration.quotationId}</AlertDescription>
                                                        </Alert>
                                                        {selectedRegistration.quotationUrl && (
                                                            <Button asChild className="w-full rounded-xl font-bold h-12 shadow-md">
                                                                <a href={selectedRegistration.quotationUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2"/> ดูใบเสนอราคา (PDF)</a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 text-slate-400">
                                                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                        <p className="text-sm font-semibold">ยังไม่มีเอกสาร</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2"><FileSignature className="w-5 h-5 text-emerald-500"/> ข้อมูล Invoice</CardTitle>
                                                <CardDescription>ใบแจ้งหนี้ที่ออกโดยระบบ</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {selectedRegistration.invoiceGenerated ? (
                                                    <div className="space-y-4">
                                                        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-xl">
                                                            <CheckCircle className="w-4 h-4 text-emerald-600"/>
                                                            <AlertTitle className="font-bold">สร้างเอกสารแล้ว</AlertTitle>
                                                            <AlertDescription className="text-xs mt-1">ระบบได้ทำการสร้างใบแจ้งหนี้ ID: {selectedRegistration.invoiceId}</AlertDescription>
                                                        </Alert>
                                                        {selectedRegistration.invoiceUrl && (
                                                            <Button asChild className="w-full rounded-xl font-bold h-12 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
                                                                <a href={selectedRegistration.invoiceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2"/> ดูใบแจ้งหนี้ (PDF)</a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 text-slate-400">
                                                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                        <p className="text-sm font-semibold">ยังไม่มีเอกสาร</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                    
                                    {selectedRegistration.additionalDocs && selectedRegistration.additionalDocs.length > 0 && (
                                        <div className="mt-8 space-y-4 max-w-4xl">
                                            <h4 className="font-bold text-lg mb-4">เอกสารแนบเพิ่มเติมจากผู้สมัคร</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                {selectedRegistration.additionalDocs.map((doc, idx) => (
                                                    <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border rounded-2xl hover:bg-slate-50 transition-colors bg-white dark:bg-slate-900">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                            <DatabaseZap className="w-5 h-5 text-blue-600"/>
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="font-semibold text-sm truncate">{doc.name}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">อัปโหลดเมื่อ {format(new Date(doc.timestamp), 'd MMM yy')}</p>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>

            <RescheduleDialog 
                isOpen={!!reschedulingRegistration} 
                onClose={() => { setReschedulingRegistration(null); setRescheduleAttendeeIds([]); }} 
                registration={reschedulingRegistration} 
                attendeeIds={rescheduleAttendeeIds} 
                schedules={schedules} 
                onSuccess={() => {}} 
            />
            
            <AlertDialog open={!!registrationToDelete} onOpenChange={v => !v && setRegistrationToDelete(null)}>
                <AlertDialogContent className="rounded-[2.5rem] shadow-2xl border-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold font-headline text-slate-900 dark:text-white">ยืนยันการลบใบสมัคร?</AlertDialogTitle>
                        <AlertDialogDescription>การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลผู้อบรมในใบสมัครนี้จะถูกลบทั้งหมด</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6">
                        <AlertDialogCancel className="rounded-xl border-none bg-slate-100 hover:bg-slate-200 h-12 font-bold px-6">ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => registrationToDelete && handleAction(deleteRegistration, registrationToDelete.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold px-8">ลบข้อมูลทันที</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}