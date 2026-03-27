'use client';

import React, { useState, useMemo, useTransition, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TrainingSchedule, Course, CourseCategory, AttendeeData, TrainingRecord, RegistrationFormField, AttendeeStatus, AttendeeAttendanceStatus, CertificateTemplate as TemplateType, ExamSession, ExamTemplate } from '@/lib/course-data';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Clock, BookCheck, ShieldCheck, XCircle, UserRound, UserRoundX,
    CalendarClock, Loader2, PlusCircle, Building, Users, Download,
    History, Edit3, UserCheck, Calendar, User, Printer, CreditCard,
    CheckCircle2, TrendingUp, UserPlus, ChevronDown, Upload, AlertCircle,
    Award, ExternalLink, ArrowLeft, GripVertical, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, where, doc, orderBy, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { CourseFilters } from '@/components/erp/course-filters';
import { useToast } from '@/hooks/use-toast';
import { CaregiverSelect } from '@/components/erp/caregiver-select';
import { EditAttendeeModal } from '@/components/erp/edit-attendee-modal';
import { AddWalkinAttendeeModal } from '@/components/erp/add-walkin-attendee-modal';
import { CardReaderInstallDialog } from '@/components/erp/card-reader-install-dialog';
import { useCardReader } from '@/hooks/use-card-reader';
import { ExamQrButton } from '@/components/erp/exam-qr-button';
import { EvalQrButton } from '@/components/erp/eval-qr-button';
import { bulkImportWalkInAttendees, bulkCompleteTrainingRecords, updateTrainingRecord, updateAttendeeOrder, resetExamSession, type BulkImportRow } from '@/app/erp/attendees/actions';
import { validateThaiID } from '@/lib/attendee-utils';
import Link from 'next/link';
import { CertificateTemplate } from '@/app/erp/certificate/certificate-template';

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

// ── Sortable row wrapper (must be outside parent component to avoid remounting) ──
function SortableRowWrapper({ id, index, isSelected, children }: {
    id: string;
    index: number;
    isSelected: boolean;
    children: React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <TableRow
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                'hover:bg-white dark:hover:bg-slate-900 transition-colors group',
                isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : '',
                isDragging ? 'shadow-2xl z-50 opacity-95 bg-white dark:bg-slate-900 ring-2 ring-primary/30' : '',
            )}
        >
            {/* Drag handle + sequence number */}
            <TableCell className="pl-3 pr-1 w-[72px]">
                <div className="flex items-center gap-1.5">
                    <button
                        {...attributes}
                        {...listeners}
                        className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-md hover:bg-slate-100"
                        tabIndex={-1}
                        aria-label="ลากเพื่อเรียงลำดับ"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 text-right select-none">{index + 1}</span>
                </div>
            </TableCell>
            {children}
        </TableRow>
    );
}

export function AttendeeManagementClientPage({ schedules, courses, categories, registrations, templates = [], initialScheduleId }: {
    schedules: TrainingSchedule[],
    courses: Course[],
    categories: CourseCategory[],
    registrations?: { id: string; formSchema: RegistrationFormField[] }[],
    templates?: TemplateType[],
    initialScheduleId?: string | null,
}) {
    const { profile } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const canManageAttendance = profile?.role === 'admin' || profile?.role === 'training_team';
    const canVerifyDocs = profile?.role === 'admin' || profile?.role === 'inspection_team';
    const canComplete = profile?.role === 'admin' || profile?.role === 'training_team';
    const canEdit = profile?.role === 'admin' || profile?.role === 'training_team';
    const isInspectionTeam = profile?.role === 'inspection_team';

    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [scheduleFilter, setScheduleFilter] = useState<string>(initialScheduleId ?? 'all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [editingCaregiver, setEditingCaregiver] = useState(false);
    const [caregiverIds, setCaregiverIds] = useState<string[]>([]);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);

    // Edit Modal State
    const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Walk-in Modal State
    const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);

    // CSV Import State
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvPreview, setCsvPreview] = useState<BulkImportRow[]>([]);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [isCsvImporting, startCsvTransition] = useTransition();

    // Smart Card Reader State
    const [isReadingCard, setIsReadingCard] = useState<string | null>(null);
    const [cardInstallDialogReason, setCardInstallDialogReason] = useState<'disconnected' | 'no_reader' | null>(null);
    const { status: cardReaderStatus, readCard: readCardFromService } = useCardReader();

    // Certificate Preview State
    const [recordForCertificate, setRecordForCertificate] = useState<TrainingRecord | null>(null);
    const [isPrintingCertificate, setIsPrintingCertificate] = useState<string | null>(null); // recordId being processed
    const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkPending, startBulkTransition] = useTransition();

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

    const examSessionsQuery = useMemoFirebase(() => {
        if (scheduleFilter === 'all' || !firestore) return null;
        return query(collection(firestore, 'examSessions'), where('scheduleId', '==', scheduleFilter));
    }, [scheduleFilter, firestore]);
    const { data: examSessionsData } = useCollection<ExamSession>(examSessionsQuery);
    const examSessions = examSessionsData || [];

    // Map: trainingRecordId -> { pretest?: ExamSession, posttest?: ExamSession }
    const examSessionMap = useMemo(() => {
        const map = new Map<string, { pretest?: ExamSession; posttest?: ExamSession }>();
        examSessions
            .filter(s => !s.superseded) // Only show active (non-reset) sessions
            .forEach(s => {
                const entry = map.get(s.trainingRecordId) ?? {};
                if (s.examType === 'pretest') entry.pretest = s;
                else entry.posttest = s;
                map.set(s.trainingRecordId, entry);
            });
        return map;
    }, [examSessions]);

    // Current course's exam template (for QR button)
    const [examTemplate, setExamTemplate] = useState<ExamTemplate | null | undefined>(undefined);

    // Exam drill-down modal
    const [examDrillRecord, setExamDrillRecord] = useState<{ record: TrainingRecord; sessions: { pretest?: ExamSession; posttest?: ExamSession } } | null>(null);
    const [resetConfirm, setResetConfirm] = useState<{ session: ExamSession; trainingRecordId: string } | null>(null);
    const [isResetting, startResetTransition] = useTransition();

    const filteredRecords = useMemo(() => {
        if (!searchQuery) return records;
        const searchLower = searchQuery.toLowerCase();
        return records.filter(r =>
            r.attendeeName.toLowerCase().includes(searchLower) ||
            r.companyName.toLowerCase().includes(searchLower) ||
            (r.attendeeId && r.attendeeId.includes(searchQuery))
        );
    }, [records, searchQuery]);

    // Summary stats
    const stats = useMemo(() => ({
        total: records.length,
        present: records.filter(r => r.attendance === 'present').length,
        absent: records.filter(r => r.attendance === 'absent').length,
        notChecked: records.filter(r => r.attendance === 'not_checked_in').length,
        completed: records.filter(r => r.status === 'completed').length,
        walkin: records.filter(r => (r as any).isWalkIn).length,
    }), [records]);

    const selectedScheduleDetails = useMemo(() => {
        if (scheduleFilter === 'all') return null;
        const schedule = schedules.find(s => s.id === scheduleFilter);
        if (!schedule) return null;
        const course = courses.find(c => c.id === schedule.courseId);
        return { ...schedule, courseTitle: course?.shortName || schedule.courseTitle || 'N/A' };
    }, [scheduleFilter, schedules, courses]);

    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    // Load exam template for selected schedule's course
    useEffect(() => {
        if (!selectedScheduleDetails) { setExamTemplate(null); return; }
        const course = courses.find(c => c.id === (selectedScheduleDetails as any).courseId);
        if (!course?.examTemplateId) { setExamTemplate(null); return; }
        if (!firestore) return;
        import('firebase/firestore').then(({ doc, getDoc }) => {
            getDoc(doc(firestore, 'examTemplates', course.examTemplateId!)).then(snap => {
                setExamTemplate(snap.exists() ? ({ id: snap.id, ...snap.data() } as ExamTemplate) : null);
            });
        });
    }, [selectedScheduleDetails, courses, firestore]);
    const schedulesMap = useMemo(() => new Map(schedules.map(s => [s.id, s])), [schedules]);
    const templatesMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);

    // ── Row ordering ──────────────────────────────────────────────
    // null = let Firestore seatNumber drive the order; array = local optimistic order
    const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

    // Sorted view: respect seatNumber from Firestore when no local order is set
    const displayRecords = useMemo(() => {
        const byId = new Map(filteredRecords.map(r => [r.id, r]));
        if (orderedIds) {
            const known = orderedIds.filter(id => byId.has(id)).map(id => byId.get(id)!);
            const added = filteredRecords.filter(r => !orderedIds.includes(r.id));
            return [...known, ...added];
        }
        return [...filteredRecords].sort((a, b) => {
            const an = Number(a.seatNumber) || 99999;
            const bn = Number(b.seatNumber) || 99999;
            return an !== bn ? an - bn : a.attendeeName.localeCompare(b.attendeeName);
        });
    }, [filteredRecords, orderedIds]);

    // Merge local order when Firestore sends updates
    useEffect(() => {
        setOrderedIds(prev => {
            if (!prev) return null;
            const ids = new Set(filteredRecords.map(r => r.id));
            const kept = prev.filter(id => ids.has(id));
            return kept.length > 0 ? kept : null;
        });
    }, [filteredRecords]);

    // Records to include in bulk print: selected completed, or all completed if no selection (respects display order)
    const recordsToPrint = useMemo(() => {
        const completed = displayRecords.filter(r => r.status === 'completed' && r.certificateId);
        const selectedCompleted = completed.filter(r => selectedIds.has(r.id));
        return selectedCompleted.length > 0 ? selectedCompleted : completed;
    }, [displayRecords, selectedIds]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setOrderedIds(prev => {
            const current = prev ?? displayRecords.map(r => r.id);
            const oldIdx = current.indexOf(String(active.id));
            const newIdx = current.indexOf(String(over.id));
            if (oldIdx === -1 || newIdx === -1) return prev;
            const next = arrayMove(current, oldIdx, newIdx);
            // Persist new order as seatNumbers
            updateAttendeeOrder(next.map((id, i) => ({ id, seatNumber: i + 1 }))).catch(console.error);
            return next;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayRecords]);

    // Track Caregiver State
    useEffect(() => {
        if (selectedScheduleDetails && (selectedScheduleDetails as any).caregiverIds) {
            setCaregiverIds((selectedScheduleDetails as any).caregiverIds || []);
        } else {
            setCaregiverIds([]);
        }
    }, [selectedScheduleDetails]);

    // Clear selection and ordering when schedule changes
    useEffect(() => {
        setSelectedIds(new Set());
        setOrderedIds(null);
    }, [scheduleFilter]);

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
                toast({ title: 'บันทึกสำเร็จ', description: 'กำหนดผู้ดูแลประจำคลาสแล้ว' });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    const handleUpdateInline = async (recordId: string, field: string, value: string | null, attendeeName: string) => {
        if (!firestore) return;
        if (field === 'status' && value === 'docs_verified') {
            const record = records.find(r => r.id === recordId);
            if (!record?.attendeeId) {
                toast({ variant: 'destructive', title: 'ต้องกรอกเลขบัตรประชาชนก่อน', description: 'กรุณาแก้ไขข้อมูลและกรอกเลขบัตรประชาชนก่อนเปลี่ยนสถานะ' });
                return;
            }
            if (!validateThaiID(record.attendeeId)) {
                toast({ variant: 'destructive', title: 'เลขบัตรประชาชนไม่ถูกต้อง', description: 'เลขบัตรประชาชนไม่ผ่านการตรวจสอบ Check Digit กรุณาตรวจสอบอีกครั้ง' });
                return;
            }
        }
        startTransition(async () => {
            try {
                let actionName = 'อัปเดตข้อมูล';
                let valueLabel = String(value);
                if (field === 'attendance') {
                    actionName = 'เช็คชื่อ';
                    valueLabel = attendanceStatusConfig[value as AttendeeAttendanceStatus]?.label || String(value);
                } else if (field === 'status') {
                    actionName = 'อัปเดตสถานะ';
                    valueLabel = attendeeStatusConfig[value as AttendeeStatus]?.label || String(value);
                } else if (field === 'preTestScore') actionName = 'อัปเดตคะแนน Pre-test';
                else if (field === 'postTestScore') actionName = 'อัปเดตคะแนน Post-test';

                if (field === 'status' && value === 'completed') {
                    // Use server action for completion: generates certificate ID, expiry, search tokens, delivery package
                    const result = await updateTrainingRecord(recordId, { status: 'completed' });
                    if (!result.success) throw new Error(result.message);
                } else {
                    const recordRef = doc(firestore, 'trainingRecords', recordId);
                    await updateDocumentNonBlocking(recordRef, { [field]: value });
                }

                await logHistory(actionName, `อัปเดต [${attendeeName}] เป็น "${valueLabel}"`);
                toast({ title: 'บันทึกสำเร็จ', description: `${actionName} เรียบร้อยแล้ว` });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    // Bulk attendance update
    const handleBulkAttendance = (attendanceValue: AttendeeAttendanceStatus) => {
        if (!firestore || selectedIds.size === 0) return;
        startBulkTransition(async () => {
            try {
                const batch = writeBatch(firestore);
                selectedIds.forEach(id => {
                    batch.update(doc(firestore, 'trainingRecords', id), { attendance: attendanceValue });
                });
                await batch.commit();
                const label = attendanceStatusConfig[attendanceValue]?.label || attendanceValue;
                await logHistory('เช็คชื่อหมู่', `เช็คชื่อ "${label}" สำหรับผู้อบรม ${selectedIds.size} คนพร้อมกัน`);
                toast({ title: 'บันทึกสำเร็จ', description: `เช็คชื่อ "${label}" จำนวน ${selectedIds.size} คน` });
                setSelectedIds(new Set());
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    // Bulk Grade (status) update
    const handleBulkStatus = (statusValue: AttendeeStatus) => {
        if (!firestore || selectedIds.size === 0) return;
        startBulkTransition(async () => {
            try {
                const label = attendeeStatusConfig[statusValue]?.label || statusValue;
                if (statusValue === 'completed') {
                    // Use server action for 'completed' to generate certificates + searchTokens properly
                    const result = await bulkCompleteTrainingRecords(Array.from(selectedIds));
                    if (!result.success) throw new Error(result.message);
                    await logHistory('ตัดเกรดผ่านหมู่', `ตัดเกรด "${label}" สำหรับผู้อบรม ${selectedIds.size} คน`);
                    toast({ title: 'บันทึกสำเร็จ', description: result.message });
                } else {
                    const batch = writeBatch(firestore);
                    selectedIds.forEach(id => {
                        batch.update(doc(firestore, 'trainingRecords', id), { status: statusValue });
                    });
                    await batch.commit();
                    await logHistory('อัปเดตสถานะหมู่', `เปลี่ยนสถานะเป็น "${label}" สำหรับผู้อบรม ${selectedIds.size} คน`);
                    toast({ title: 'บันทึกสำเร็จ', description: `เปลี่ยนสถานะ ${selectedIds.size} คน เป็น "${label}"` });
                }
                setSelectedIds(new Set());
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    // Complete a docs_verified record and immediately show its certificate
    const handleCompleteAndPrint = async (record: TrainingRecord) => {
        setIsPrintingCertificate(record.id);
        try {
            const result = await updateTrainingRecord(record.id, { status: 'completed' });
            if (!result.success) throw new Error(result.message);
            const updatedRecord = result.record ?? { ...record, status: 'completed' as AttendeeStatus };
            setRecordForCertificate(updatedRecord);
            await logHistory('ตัดเกรดและพิมพ์ใบเซอร์', `ตัดเกรดผ่าน [${record.attendeeName}] และเปิดพรีวิวใบประกาศ`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
        } finally {
            setIsPrintingCertificate(null);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRecords.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecords.map(r => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const applySmartCardData = async (record: TrainingRecord, data: any) => {
        if (!firestore) return;
        const { setDoc } = await import('firebase/firestore');
        const fullName = `${data.titleTH || ''}${data.firstNameTH || ''} ${data.lastNameTH || ''}`.trim();
        startTransition(async () => {
            try {
                const recordRef = doc(firestore, 'trainingRecords', record.id);
                const attendeeRef = doc(firestore, 'attendees', data.citizenId);
                await updateDocumentNonBlocking(recordRef, {
                    attendance: 'present',
                    attendeeId: data.citizenId,
                    attendeeName: fullName || record.attendeeName,
                    dateOfBirth: data.dob || null
                });
                await setDoc(attendeeRef, {
                    attendeeId: data.citizenId,
                    fullName: fullName || record.attendeeName,
                    dateOfBirth: data.dob || null
                }, { merge: true });
                await logHistory('อ่านบัตร Smart Card', `เสียบบัตร ปชช. ${data.citizenId} เช็คชื่อ [${fullName}]`);
                toast({ title: 'อ่านบัตร ปชช. สำเร็จ', description: `เช็คชื่อ "มาเรียน" ของ ${fullName}` });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'จัดเก็บข้อมูลล้มเหลว', description: e.message });
            } finally {
                setIsReadingCard(null);
            }
        });
    };

    const handleSmartCardRead = async (record: TrainingRecord) => {
        // ตรวจสอบสถานะก่อนอ่าน — ไม่มี mock data
        if (cardReaderStatus === 'checking' || cardReaderStatus === 'disconnected') {
            setCardInstallDialogReason('disconnected');
            return;
        }
        if (cardReaderStatus === 'no_reader') {
            setCardInstallDialogReason('no_reader');
            return;
        }

        toast({ title: 'กรุณาเสียบบัตรประชาชน', description: 'วางบัตรบนเครื่องอ่านค้างไว้', duration: 5000 });
        setIsReadingCard(record.id);
        try {
            const data = await readCardFromService();
            await applySmartCardData(record, data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'อ่านบัตรไม่สำเร็จ', description: e.message || 'กรุณาเสียบบัตรให้แน่นแล้วลองใหม่' });
        } finally {
            setIsReadingCard(null);
        }
    };

    const exportToCSV = () => {
        if (filteredRecords.length === 0) return;
        const headers = ["ลำดับ", "ชื่อ-นามสกุล", "เลขบัตรประชาชน", "บริษัท", "Walk-in", "การเข้าเรียน", "สถานะอบรม", "คะแนน Pre-test", "คะแนน Post-test", "เลขที่ใบสมัคร"];
        const rows = filteredRecords.map((r, index) => [
            index + 1,
            `"${r.attendeeName}"`,
            r.attendeeId || '-',
            `"${r.companyName}"`,
            (r as any).isWalkIn ? 'Walk-in' : '-',
            attendanceStatusConfig[r.attendance]?.label || r.attendance,
            attendeeStatusConfig[r.status]?.label || r.status,
            r.preTestScore || '-',
            r.postTestScore || '-',
            r.registrationId.slice(0, 12),
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
        logHistory('ดาวน์โหลดรายงาน', `Export CSV ${filteredRecords.length} คน`);
        toast({ title: 'ดาวน์โหลดสำเร็จ', description: 'สร้างไฟล์ CSV เรียบร้อยแล้ว' });
    };

    const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            // Skip header row if it starts with non-numeric / contains "ชื่อ" keyword
            const dataLines = lines[0]?.toLowerCase().includes('ชื่อ') || lines[0]?.toLowerCase().includes('name') ? lines.slice(1) : lines;
            const rows: BulkImportRow[] = [];
            const errs: string[] = [];
            dataLines.forEach((line, i) => {
                // Support comma or tab separated. Columns: attendeeName, companyName, attendeeId(optional)
                const cols = line.split(/,|\t/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols.length < 2) { errs.push(`แถว ${i + 1}: ต้องมีอย่างน้อย 2 คอลัมน์ (ชื่อ, บริษัท)`); return; }
                rows.push({ attendeeName: cols[0], companyName: cols[1], attendeeId: cols[2] || undefined });
            });
            setCsvPreview(rows);
            setCsvErrors(errs);
        };
        reader.readAsText(file, 'UTF-8');
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const handleCsvImport = () => {
        if (!scheduleFilter || scheduleFilter === 'all' || csvPreview.length === 0) return;
        startCsvTransition(async () => {
            const result = await bulkImportWalkInAttendees(csvPreview, scheduleFilter);
            if (result.success) {
                toast({ title: 'นำเข้าสำเร็จ', description: result.message });
                logHistory('นำเข้า CSV', `นำเข้ารายชื่อ Walk-in จาก CSV จำนวน ${result.created} คน`);
                setIsCsvModalOpen(false);
                setCsvPreview([]);
                setCsvErrors([]);
            } else {
                toast({ variant: 'destructive', title: 'ผิดพลาด', description: result.message });
            }
        });
    };

    // Stat card subcomponent
    const StatCard = ({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) => (
        <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl border gap-1", color)}>
            <Icon className="w-5 h-5 mb-1 opacity-80" />
            <span className="text-2xl font-black font-mono leading-none">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-center leading-tight">{label}</span>
        </div>
    );

    // ── Bulk Print Mode ────────────────────────────────────────────
    if (isBulkPrintMode) {
        return (
            <div>
                {/* Controls bar — hidden on print */}
                <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-md px-6 py-3 flex items-center justify-between gap-4">
                    <Button variant="ghost" className="rounded-xl font-bold h-11 gap-2" onClick={() => setIsBulkPrintMode(false)}>
                        <ArrowLeft className="w-4 h-4" /> กลับ
                    </Button>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-600">
                            {recordsToPrint.length} ใบประกาศ
                            {selectedIds.size > 0 && ` (จากที่เลือก ${selectedIds.size} คน)`}
                        </span>
                        <Button className="rounded-xl font-bold h-11 px-8 shadow-md shadow-primary/20" onClick={() => window.print()}>
                            <Printer className="w-4 h-4 mr-2" /> พิมพ์ / PDF
                        </Button>
                    </div>
                </div>

                {/* Certificates — one per page on print */}
                <div className="pt-20 print:pt-0 bg-gray-100 print:bg-white min-h-screen">
                    {recordsToPrint.map((record, index) => {
                        const certCourse = coursesMap.get(record.courseId);
                        const certSchedule = schedulesMap.get(record.scheduleId);
                        const certTemplate = certCourse?.certificateTemplateId ? templatesMap.get(certCourse.certificateTemplateId) : undefined;
                        if (!certCourse || !certSchedule) return null;
                        return (
                            <div key={record.id} className={cn('p-6 print:p-0', index < recordsToPrint.length - 1 && 'break-after-page')}>
                                <div className="max-w-4xl mx-auto print:max-w-none">
                                    <CertificateTemplate record={record} course={certCourse} schedule={certSchedule} template={certTemplate} />
                                </div>
                                {/* Cert ID label — print only */}
                                <p className="hidden print:block text-[9px] text-center text-gray-400 mt-1 font-mono">{record.certificateId}</p>
                            </div>
                        );
                    })}
                    {recordsToPrint.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 opacity-40 print:hidden">
                            <Award className="w-16 h-16 mb-4 text-slate-400" />
                            <p className="font-bold text-slate-600">ไม่มีใบประกาศที่พร้อมพิมพ์</p>
                            <p className="text-sm mt-1 text-slate-500">ต้องมีผู้อบรมที่สถานะ "ผ่านการอบรม" ในรอบนี้</p>
                        </div>
                    )}
                </div>
                <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4 landscape; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }` }} />
            </div>
        );
    }
    // ────────────────────────────────────────────────────────────────

    return (
        <>
        <div className="space-y-6 pb-20">
            {/* Top Bar */}
            <div className="flex flex-col gap-4 text-left">
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
                                    <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl font-semibold"><Building className="w-4 h-4" /> {new Set(records.map(a => a.companyName)).size} บริษัท</span>
                                    {stats.walkin > 0 && <span className="flex items-center gap-1.5 text-violet-600 bg-violet-50 px-3 py-1.5 rounded-xl font-semibold"><UserPlus className="w-4 h-4" /> Walk-in {stats.walkin} คน</span>}
                                </div>
                                {/* Caregiver */}
                                <div className="flex items-center gap-3 mt-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 shadow-sm max-w-fit">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ผู้ดูแลประจำคลาส</div>
                                        {editingCaregiver ? (
                                            <div className="flex items-center gap-2 mt-1 relative z-[50]">
                                                <div className="w-[300px]"><CaregiverSelect value={caregiverIds} onChange={setCaregiverIds} /></div>
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
                                                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">ยังไม่ได้ระบุทีมดูแล</span>
                                                )}
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full hover:bg-slate-100" onClick={() => setEditingCaregiver(true)}>
                                                        <Edit3 className="w-3 h-3 text-slate-400" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                                {scheduleFilter !== 'all' && examTemplate && (
                                    <ExamQrButton scheduleId={scheduleFilter} template={examTemplate} />
                                )}
                                {scheduleFilter !== 'all' && (() => {
                                    const sch = schedules.find(s => s.id === scheduleFilter);
                                    const course = sch ? courses.find(c => c.id === sch.courseId) : null;
                                    return course?.evaluationTemplateId ? <EvalQrButton scheduleId={scheduleFilter} /> : null;
                                })()}
                                {scheduleFilter !== 'all' && (
                                    <Button variant="outline" className="rounded-xl font-bold shadow-sm h-11 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => setIsBulkPrintMode(true)} disabled={recordsToPrint.length === 0}>
                                        <Printer className="w-4 h-4 mr-2" />
                                        พิมพ์ใบประกาศ
                                        {recordsToPrint.length > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs font-black">{recordsToPrint.length}</span>}
                                    </Button>
                                )}
                                <Button variant="outline" className="rounded-xl font-bold shadow-sm h-11 border-slate-200" onClick={() => setShowHistoryDialog(true)}>
                                    <History className="w-4 h-4 mr-2" /> ประวัติ
                                </Button>
                                <Button className="rounded-xl font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white h-11" onClick={exportToCSV}>
                                    <Download className="w-4 h-4 mr-2" /> Export CSV
                                </Button>
                                {canEdit && (
                                    <Button variant="outline" className="rounded-xl font-bold shadow-sm h-11 border-slate-200" onClick={() => setIsCsvModalOpen(true)}>
                                        <Upload className="w-4 h-4 mr-2" /> Import CSV
                                    </Button>
                                )}
                                {canEdit && (
                                    <Button
                                        className="rounded-xl font-bold shadow-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-11"
                                        onClick={() => setIsWalkinModalOpen(true)}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" /> เพิ่ม Walk-in
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        {/* Stats Bar */}
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                <StatCard label="ผู้อบรมทั้งหมด" value={stats.total} color="bg-white border-slate-200 text-slate-700" icon={Users} />
                                <StatCard label="มาเรียน" value={stats.present} color="bg-emerald-50 border-emerald-200 text-emerald-700" icon={UserRound} />
                                <StatCard label="ขาดเรียน" value={stats.absent} color="bg-rose-50 border-rose-200 text-rose-700" icon={UserRoundX} />
                                <StatCard label="รอเช็คชื่อ" value={stats.notChecked} color="bg-amber-50 border-amber-200 text-amber-700" icon={CalendarClock} />
                                <StatCard label="ผ่านการอบรม" value={stats.completed} color="bg-green-50 border-green-200 text-green-700" icon={ShieldCheck} />
                            </div>
                        </div>

                        <CardContent className="p-0 bg-slate-50/50 dark:bg-slate-950/50">
                            {/* Bulk Action Toolbar */}
                            {selectedIds.size > 0 && (
                                <div className="px-8 py-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center gap-3">
                                    <span className="font-bold text-indigo-700 text-sm flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />เลือกแล้ว {selectedIds.size} คน
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap ml-2">
                                        {canManageAttendance && (
                                            <Button size="sm" className="h-8 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" onClick={() => handleBulkAttendance('present')} disabled={isBulkPending}>
                                                {isBulkPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserRound className="w-3 h-3 mr-1" />}
                                                มาทั้งหมด
                                            </Button>
                                        )}
                                        {canManageAttendance && (
                                            <Button size="sm" className="h-8 rounded-lg font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-sm" onClick={() => handleBulkAttendance('absent')} disabled={isBulkPending}>
                                                {isBulkPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserRoundX className="w-3 h-3 mr-1" />}
                                                ขาดทั้งหมด
                                            </Button>
                                        )}
                                        {canComplete && (
                                            <Button size="sm" className="h-8 rounded-lg font-bold bg-green-500 hover:bg-green-600 text-white shadow-sm" onClick={() => handleBulkStatus('completed')} disabled={isBulkPending}>
                                                <ShieldCheck className="w-3 h-3 mr-1" /> ผ่านอบรม
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="h-8 rounded-lg font-bold text-slate-500" onClick={() => setSelectedIds(new Set())}>
                                            ยกเลิกการเลือก
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Data Grid */}
                            <div className="overflow-x-auto custom-scrollbar">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <Table className="min-w-[1260px]">
                                    <TableHeader className="bg-white dark:bg-slate-900 border-y">
                                        <TableRow className="hover:bg-transparent shadow-sm">
                                            <TableHead className="py-5 pl-3 w-[72px] uppercase tracking-widest text-[11px] text-slate-400 font-bold">ลำดับ</TableHead>
                                            <TableHead className="py-5 pl-2 w-[44px]">
                                                <Checkbox
                                                    checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                                                    onCheckedChange={toggleSelectAll}
                                                    aria-label="เลือกทั้งหมด"
                                                />
                                            </TableHead>
                                            <TableHead className="py-5 uppercase tracking-widest text-[11px] text-slate-400 font-bold w-[280px]">ชื่อผู้อบรม / บริษัท</TableHead>
                                            <TableHead className="uppercase tracking-widest text-[11px] text-slate-400 font-bold w-[260px]">เช็คชื่อรายวัน</TableHead>
                                            <TableHead className="uppercase tracking-widest text-[11px] text-slate-400 font-bold w-[200px]">การตรวจสอบ (Docs)</TableHead>
                                            <TableHead className="uppercase tracking-widest text-[11px] text-slate-400 font-bold text-center w-[200px]">คะแนน (Pre / Post)</TableHead>
                                            <TableHead className="text-right pr-8 uppercase tracking-widest text-[11px] text-slate-400 font-bold">เพิ่มเติม</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <SortableContext items={displayRecords.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-50" /></TableCell></TableRow>
                                        ) : displayRecords.length > 0 ? displayRecords.map((record, index) => (
                                            <SortableRowWrapper
                                                key={record.id}
                                                id={record.id}
                                                index={index}
                                                isSelected={selectedIds.has(record.id)}
                                            >
                                                <TableCell className="pl-2 w-[44px]">
                                                    <Checkbox
                                                        checked={selectedIds.has(record.id)}
                                                        onCheckedChange={() => toggleSelect(record.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-6 text-left">
                                                    <div className="flex items-start gap-3">
                                                        <Avatar className="w-9 h-9 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm mt-0.5">
                                                            <AvatarImage src={(record as any).profilePicture || undefined} alt={record.attendeeName} className="object-cover" />
                                                            <AvatarFallback className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-sm font-bold">
                                                                {record.attendeeName.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                                {record.attendeeName}
                                                                {(record as any).isWalkIn && (
                                                                    <Badge className="text-[9px] bg-violet-100 text-violet-700 border-violet-200 font-bold px-1.5 py-0.5 h-auto">Walk-in</Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground font-medium uppercase mt-1 flex items-center gap-1.5">
                                                                <Building className="w-3 h-3" /> {record.companyName}
                                                                <span className="text-slate-300 mx-1">|</span>
                                                                <span className="font-mono">{record.registrationId.slice(0, 6)}</span>
                                                            </div>
                                                            {record.attendeeId && (
                                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{record.attendeeId}</div>
                                                            )}
                                                        </div>
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
                                                                    disabled={isPending || !canManageAttendance}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50",
                                                                        isSelected
                                                                            ? (status === 'present' ? 'bg-emerald-500 text-white shadow-md' : status === 'absent' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-400 text-white shadow-md')
                                                                            : "text-slate-500 hover:bg-white hover:shadow-sm"
                                                                    )}
                                                                >
                                                                    {status === 'present' ? 'มา' : status === 'absent' ? 'ขาด' : 'รอ'}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-left">
                                                    <div className="flex items-center gap-1.5">
                                                    {!record.attendeeId && record.status === 'pending_verification' && (
                                                        <span title="ยังไม่มีเลขบัตรประชาชน"><AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /></span>
                                                    )}
                                                    <Select
                                                        value={record.status}
                                                        onValueChange={(v) => {
                                                            if (isInspectionTeam && v !== 'docs_verified') return;
                                                            handleUpdateInline(record.id, 'status', v, record.attendeeName);
                                                        }}
                                                        disabled={isPending}
                                                    >
                                                        <SelectTrigger className={cn("h-10 rounded-xl font-bold border-none shadow-sm", attendeeStatusConfig[record.status]?.badgeClass)}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl">
                                                            {Object.entries(attendeeStatusConfig)
                                                                .filter(([key]) => {
                                                                    if (isInspectionTeam) return key === 'pending_verification' || key === 'docs_verified';
                                                                    if (!canComplete) return key !== 'completed' && key !== 'failed';
                                                                    if (!canVerifyDocs) return key !== 'docs_verified';
                                                                    return true;
                                                                })
                                                                .map(([key, config]) => (
                                                                    <SelectItem key={key} value={key} className="font-semibold">{config.label}</SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(() => {
                                                        const ses = examSessionMap.get(record.id);
                                                        const hasSessions = ses?.pretest || ses?.posttest;
                                                        if (hasSessions) {
                                                            return (
                                                                <button
                                                                    onClick={() => setExamDrillRecord({ record, sessions: ses! })}
                                                                    className="flex items-center justify-center gap-1.5 group"
                                                                    title="คลิกเพื่อดูรายละเอียดคำตอบ"
                                                                >
                                                                    {ses?.pretest ? (
                                                                        <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold border', ses.pretest.passed === false ? 'bg-red-50 text-red-700 border-red-200' : ses.pretest.passed === true ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200')}>
                                                                            {ses.pretest.rawScore}/{ses.pretest.totalPoints}
                                                                        </span>
                                                                    ) : record.preTestScore ? (
                                                                        <Input
                                                                            defaultValue={record.preTestScore}
                                                                            onBlur={e => handleUpdateInline(record.id, 'preTestScore', e.target.value, record.attendeeName)}
                                                                            className="h-7 w-14 text-center rounded-lg text-xs font-bold bg-slate-50 border-slate-200"
                                                                            placeholder="Pre"
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    ) : <span className="text-muted-foreground text-xs">–</span>}
                                                                    <span className="text-slate-300 text-xs">/</span>
                                                                    {ses?.posttest ? (
                                                                        <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold border', ses.posttest.passed === false ? 'bg-red-50 text-red-700 border-red-200' : ses.posttest.passed === true ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
                                                                            {ses.posttest.rawScore}/{ses.posttest.totalPoints}
                                                                        </span>
                                                                    ) : record.postTestScore ? (
                                                                        <Input
                                                                            defaultValue={record.postTestScore}
                                                                            onBlur={e => handleUpdateInline(record.id, 'postTestScore', e.target.value, record.attendeeName)}
                                                                            className="h-7 w-14 text-center rounded-lg text-xs font-bold bg-slate-50 border-slate-200 text-emerald-600"
                                                                            placeholder="Post"
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    ) : <span className="text-muted-foreground text-xs">–</span>}
                                                                </button>
                                                            );
                                                        }
                                                        // No sessions – show manual inputs
                                                        return (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Input
                                                                    defaultValue={record.preTestScore || ''}
                                                                    onBlur={e => handleUpdateInline(record.id, 'preTestScore', e.target.value, record.attendeeName)}
                                                                    className="h-9 w-16 text-center rounded-xl font-bold bg-slate-50 border-slate-200 focus:bg-white"
                                                                    placeholder="Pre"
                                                                />
                                                                <span className="text-slate-300 font-light">/</span>
                                                                <Input
                                                                    defaultValue={record.postTestScore || ''}
                                                                    onBlur={e => handleUpdateInline(record.id, 'postTestScore', e.target.value, record.attendeeName)}
                                                                    className="h-9 w-16 text-center rounded-xl font-bold bg-slate-50 border-slate-200 focus:bg-white text-emerald-600"
                                                                    placeholder="Post"
                                                                />
                                                            </div>
                                                        );
                                                    })()}
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
                                                            <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 px-2 shadow-sm" onClick={() => setRecordForCertificate(record)} disabled={!record.certificateId}>
                                                                <Award className="w-3.5 h-3.5 mr-1" /> ใบเซอร์
                                                            </Button>
                                                        )}
                                                        {record.status === 'docs_verified' && canComplete && (
                                                            <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 shadow-sm" onClick={() => handleCompleteAndPrint(record)} disabled={isPrintingCertificate === record.id}>
                                                                {isPrintingCertificate === record.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Printer className="w-3.5 h-3.5 mr-1" />}
                                                                {isPrintingCertificate === record.id ? 'กำลังสร้าง...' : 'ตัดเกรด+พิมพ์'}
                                                            </Button>
                                                        )}
                                                        {canEdit && (
                                                            <Button variant="secondary" size="sm" className="h-8 rounded-lg font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 px-2" onClick={() => { setEditingRecord(record); setIsEditModalOpen(true); }}>
                                                                <Edit3 className="w-3.5 h-3.5 mr-1" /> แก้ไข
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </SortableRowWrapper>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center opacity-40">
                                                        <Users className="w-12 h-12 mb-4 text-slate-400" />
                                                        <p className="font-bold">ไม่พบข้อมูลผู้อบรม</p>
                                                        <p className="text-xs mt-1">ลองเปลี่ยนเงื่อนไขการค้นหาข้อมูล</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    </SortableContext>
                                </Table>
                                </DndContext>
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
                    <p className="text-slate-500 mt-2">เพื่อจัดการรายชื่อและบันทึกข้อมูลประจำวัน</p>
                </div>
            )}

            <EditAttendeeModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                record={editingRecord}
                onSuccess={() => setIsEditModalOpen(false)}
            />

            <AddWalkinAttendeeModal
                isOpen={isWalkinModalOpen}
                onClose={() => setIsWalkinModalOpen(false)}
                schedule={selectedScheduleDetails as any}
                onSuccess={() => setIsWalkinModalOpen(false)}
            />

            {/* Exam Drill-down Dialog */}
            <Dialog open={!!examDrillRecord} onOpenChange={open => !open && setExamDrillRecord(null)}>
                <DialogContent className="rounded-3xl max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            ผลการทดสอบ — {examDrillRecord?.record.attendeeName}
                        </DialogTitle>
                    </DialogHeader>
                    {examDrillRecord && (() => {
                        const { sessions } = examDrillRecord;
                        const renderSession = (ses: ExamSession | undefined, label: string) => {
                            if (!ses) return null;
                            const config = ses.examType === 'pretest' ? examTemplate?.pretest : examTemplate?.posttest;
                            const qMap = new Map(config?.questions.map(q => [q.id, q]) ?? []);
                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-sm">{label}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={cn('text-lg font-bold', ses.passed === false ? 'text-red-500' : ses.passed === true ? 'text-emerald-600' : 'text-blue-600')}>
                                                {ses.rawScore}/{ses.totalPoints}
                                            </span>
                                            <span className="text-sm text-muted-foreground">({ses.scorePercent}%)</span>
                                            {ses.passed !== null && (
                                                <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', ses.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                                                    {ses.passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                                                </span>
                                            )}
                                            <Button
                                                variant="outline" size="sm"
                                                className="h-7 px-2 rounded-lg text-xs gap-1 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100"
                                                onClick={() => setResetConfirm({ session: ses, trainingRecordId: examDrillRecord!.record.id })}
                                                title="รีเซ็ตให้สอบใหม่"
                                            >
                                                <RotateCcw className="w-3 h-3" /> รีเซ็ต
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Additional responses (before sections) */}
                                    {ses.additionalResponses && ses.additionalResponses.length > 0 && config?.additionalSections?.filter(s => s.placement === 'before').map(sec => {
                                        const resp = ses.additionalResponses!.find(r => r.sectionId === sec.id);
                                        if (!resp) return null;
                                        return (
                                            <div key={sec.id} className="bg-muted/40 rounded-xl p-3 space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground">{sec.title}</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {sec.fields.map(f => (
                                                        <div key={f.id}>
                                                            <span className="text-xs text-muted-foreground">{f.label}: </span>
                                                            <span className="text-xs font-medium">{resp.responses[f.id] ?? '–'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Answers */}
                                    <div className="space-y-1.5">
                                        {ses.answers.map((ans, i) => {
                                            const q = qMap.get(ans.questionId);
                                            if (!q) return null;
                                            const selOpt = q.options.find(o => o.id === ans.selectedOptionId);
                                            const corOpt = q.options.find(o => o.id === q.correctOptionId);
                                            return (
                                                <div key={ans.questionId} className={cn('p-2.5 rounded-xl border text-xs', ans.isCorrect ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20')}>
                                                    <p className="font-medium mb-1">{i + 1}. {q.text}</p>
                                                    <p>
                                                        <span className="text-muted-foreground">ตอบ: </span>
                                                        <span className={ans.isCorrect ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                                                            {selOpt ? `${selOpt.label} ${selOpt.text}` : '(ไม่ได้ตอบ)'}
                                                        </span>
                                                    </p>
                                                    {!ans.isCorrect && <p className="text-emerald-700"><span className="text-muted-foreground">เฉลย: </span>{corOpt ? `${corOpt.label} ${corOpt.text}` : '–'}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* After sections */}
                                    {ses.additionalResponses && ses.additionalResponses.length > 0 && config?.additionalSections?.filter(s => s.placement === 'after').map(sec => {
                                        const resp = ses.additionalResponses!.find(r => r.sectionId === sec.id);
                                        if (!resp) return null;
                                        return (
                                            <div key={sec.id} className="bg-muted/40 rounded-xl p-3 space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground">{sec.title}</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {sec.fields.map(f => (
                                                        <div key={f.id}>
                                                            <span className="text-xs text-muted-foreground">{f.label}: </span>
                                                            <span className="text-xs font-medium">{resp.responses[f.id] ?? '–'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        };
                        return (
                            <div className="space-y-4">
                                {renderSession(sessions.pretest, 'ผล Pre-test (ก่อนเรียน)')}
                                {sessions.pretest && sessions.posttest && <div className="border-t" />}
                                {renderSession(sessions.posttest, 'ผล Post-test (หลังเรียน)')}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Reset Exam Confirmation */}
            <AlertDialog open={!!resetConfirm} onOpenChange={open => !open && setResetConfirm(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-amber-600" /> ยืนยันรีเซ็ตแบบทดสอบ
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            ผู้อบรมจะสามารถทำแบบทดสอบ{resetConfirm?.session.examType === 'pretest' ? 'ก่อนเรียน' : 'หลังเรียน'}ใหม่ได้
                            คะแนนเดิม ({resetConfirm?.session.rawScore}/{resetConfirm?.session.totalPoints} คะแนน) จะถูกเก็บไว้ในประวัติ
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-amber-500 hover:bg-amber-600"
                            disabled={isResetting}
                            onClick={() => {
                                if (!resetConfirm || !profile?.uid) return;
                                startResetTransition(async () => {
                                    const res = await resetExamSession(
                                        resetConfirm.session.id,
                                        resetConfirm.session.examType,
                                        resetConfirm.trainingRecordId,
                                        profile.uid,
                                    );
                                    toast({ title: res.message, variant: res.success ? 'default' : 'destructive' });
                                    if (res.success) {
                                        setResetConfirm(null);
                                        setExamDrillRecord(null);
                                    }
                                });
                            }}
                        >
                            {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                            รีเซ็ตและให้สอบใหม่
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* CSV Import Dialog */}
            <Dialog open={isCsvModalOpen} onOpenChange={(open) => { setIsCsvModalOpen(open); if (!open) { setCsvPreview([]); setCsvErrors([]); } }}>
                <DialogContent className="sm:max-w-2xl rounded-[2.5rem] z-[200]">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold font-headline">
                            <Upload className="w-6 h-6 text-primary" /> นำเข้ารายชื่อจาก CSV
                        </DialogTitle>
                        <DialogDescription>
                            รูปแบบ CSV: <code className="bg-muted px-1 rounded text-xs">ชื่อ-นามสกุล, บริษัท/หน่วยงาน, เลขบัตรประชาชน (optional)</code><br />
                            รองรับ comma (,) หรือ tab (\t) เป็น delimiter — สามารถมี header row ได้
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 space-y-4">
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/30 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                            <div className="text-center">
                                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground font-medium">คลิกเพื่อเลือกไฟล์ .csv</span>
                            </div>
                            <input type="file" accept=".csv,.txt" className="sr-only" onChange={handleCsvFile} />
                        </label>
                        {csvErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                                <p className="text-xs font-bold text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> พบข้อผิดพลาด {csvErrors.length} รายการ</p>
                                {csvErrors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                            </div>
                        )}
                        {csvPreview.length > 0 && (
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-muted/20 px-4 py-2 text-xs font-bold text-muted-foreground">
                                    ตัวอย่างข้อมูล ({csvPreview.length} รายการ) — แสดง 5 แรก
                                </div>
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/10">
                                        <tr>
                                            <th className="text-left p-2 font-semibold">#</th>
                                            <th className="text-left p-2 font-semibold">ชื่อ-นามสกุล</th>
                                            <th className="text-left p-2 font-semibold">บริษัท/หน่วยงาน</th>
                                            <th className="text-left p-2 font-semibold">เลขบัตร</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {csvPreview.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="hover:bg-muted/5">
                                                <td className="p-2 text-muted-foreground">{i + 1}</td>
                                                <td className="p-2 font-medium">{row.attendeeName}</td>
                                                <td className="p-2 text-muted-foreground">{row.companyName}</td>
                                                <td className="p-2 text-muted-foreground">{row.attendeeId || '-'}</td>
                                            </tr>
                                        ))}
                                        {csvPreview.length > 5 && (
                                            <tr><td colSpan={4} className="p-2 text-center text-muted-foreground italic">...และอีก {csvPreview.length - 5} รายการ</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="p-6 pt-4 gap-2">
                        <Button variant="ghost" onClick={() => setIsCsvModalOpen(false)} className="rounded-xl h-11">ยกเลิก</Button>
                        <Button
                            onClick={handleCsvImport}
                            disabled={csvPreview.length === 0 || isCsvImporting}
                            className="rounded-xl h-11 font-bold"
                        >
                            {isCsvImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            นำเข้า {csvPreview.length > 0 ? `(${csvPreview.length} คน)` : ''}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Certificate Preview Dialog */}
            {(() => {
                if (!recordForCertificate) return null;
                const certCourse = coursesMap.get(recordForCertificate.courseId);
                const certSchedule = schedulesMap.get(recordForCertificate.scheduleId);
                const certTemplate = certCourse?.certificateTemplateId ? templatesMap.get(certCourse.certificateTemplateId) : undefined;
                if (!certCourse || !certSchedule) return null;
                return (
                    <Dialog open={!!recordForCertificate} onOpenChange={(v) => !v && setRecordForCertificate(null)}>
                        <DialogContent className="max-w-5xl rounded-[2rem] p-0 overflow-hidden shadow-2xl border-none z-[200]">
                            <DialogHeader className="p-6 pb-4 text-left border-b bg-white dark:bg-slate-950 print:hidden">
                                <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
                                    <Award className="w-5 h-5 text-amber-500" /> พรีวิวใบประกาศนียบัตร
                                </DialogTitle>
                                <DialogDescription>{recordForCertificate.attendeeName} — {certCourse.title}</DialogDescription>
                            </DialogHeader>
                            <div className="p-8 bg-slate-100/60 flex justify-center print:p-0 print:bg-white">
                                <div className="max-w-4xl w-full">
                                    <CertificateTemplate record={recordForCertificate} course={certCourse} schedule={certSchedule} template={certTemplate} />
                                </div>
                            </div>
                            <DialogFooter className="p-5 border-t bg-white dark:bg-slate-950 print:hidden flex gap-2 justify-between sm:justify-between">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                    <span className="font-semibold text-slate-500">เลขที่:</span>
                                    <span>{recordForCertificate.certificateId || '—'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={() => setRecordForCertificate(null)} className="rounded-xl font-bold h-11 px-5">ปิด</Button>
                                    <Button asChild variant="outline" className="rounded-xl font-bold h-11 px-5 border-blue-200 text-blue-700 hover:bg-blue-50">
                                        <Link href={`/erp/certificate/${recordForCertificate.id}`} target="_blank">
                                            <ExternalLink className="w-4 h-4 mr-2" /> เปิดหน้าพิมพ์
                                        </Link>
                                    </Button>
                                    <Button onClick={() => window.print()} className="rounded-xl font-bold h-11 px-6 shadow-md shadow-primary/20">
                                        <Printer className="w-4 h-4 mr-2" /> พิมพ์ / PDF
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                );
            })()}
        </div>

        {cardInstallDialogReason && (
            <CardReaderInstallDialog
                open
                reason={cardInstallDialogReason}
                onClose={() => setCardInstallDialogReason(null)}
            />
        )}
        </>
    );
}
