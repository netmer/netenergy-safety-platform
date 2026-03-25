'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef, useTransition } from 'react';
import type { TrainingRecord, AttendeeData, Course, AdditionalDoc } from '@/lib/course-data';
import { format, differenceInDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search, ShieldCheck, Building, Briefcase, AlertTriangle,
    ShieldX, Infinity, Edit, Save, Loader2, Trash2, Users,
    BookOpen, FilterX, Download, CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getPaginatedHistory, deleteAttendeeDocument, updateSingleAttendeeData, addAttendeeDocument } from './actions';
import { useDebounce } from '@/hooks/use-debounce';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { DocumentThumbnail } from '@/components/document-thumbnail';
import { useToast } from '@/hooks/use-toast';
import { FileUp } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

interface GroupedResult {
    id: string;
    attendeeName: string;
    companyName: string;
    attendeeId: string | null;
    profilePicture?: string;
    education?: string;
    dateOfBirth?: string;
    documents?: AdditionalDoc[];
    completedCourses: (TrainingRecord & { course?: Course })[];
    latestCompletion: string;
    hasExpired: boolean;
    hasExpiringSoon: boolean;
}

// ── Cert expiry helper ────────────────────────────────────────────────────────
const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return { text: 'ตลอดชีพ', color: 'bg-blue-100 text-blue-800', icon: Infinity as any };
    try {
        const expiry = parseISO(expiryDate);
        const days = differenceInDays(expiry, new Date());
        if (days < 0) return { text: 'หมดอายุ', color: 'bg-red-100 text-red-800', icon: ShieldX };
        if (days <= 90) return { text: `ใกล้หมดอายุ (${days} วัน)`, color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
        return { text: 'ยังไม่หมดอายุ', color: 'bg-green-100 text-green-800', icon: ShieldCheck };
    } catch {
        return { text: 'ข้อมูลผิดพลาด', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
};

// ── Build Thai year options for filter ───────────────────────────────────────
const currentCEYear = new Date().getFullYear();
const YEAR_OPTIONS: { label: string; value: number }[] = Array.from(
    { length: 10 },
    (_, i) => {
        const ce = currentCEYear - i;
        return { label: `${ce + 543}`, value: ce };
    }
);

// ── Document uploader ─────────────────────────────────────────────────────────
function AttendeeDocumentUploader({ attendeeId, onUploadSuccess }: { attendeeId: string; onUploadSuccess: () => void }) {
    const { toast } = useToast();
    const { profile } = useAuth();
    const [isUploading, startUploadTransition] = useTransition();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        startUploadTransition(async () => {
            const formData = new FormData();
            formData.append('attendeeId', attendeeId);
            formData.append('uploadedBy', profile?.displayName || 'N/A');
            formData.append('file', file);
            const result = await addAttendeeDocument(formData);
            if (result.success) {
                toast({ title: 'สำเร็จ', description: result.message });
                onUploadSuccess();
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    return (
        <div className="flex items-center gap-2 pt-2">
            <label htmlFor={`file-upload-${attendeeId}`} className={cn(buttonVariants({ variant: 'outline' }), "w-full cursor-pointer")}>
                <FileUp className="mr-2 h-4 w-4" />
                แนบเอกสารประจำตัว
                <input id={`file-upload-${attendeeId}`} ref={fileInputRef} type="file" className="sr-only" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
    );
}

// ── Details dialog ────────────────────────────────────────────────────────────
function HistoryDetailsDialog({
    record, isOpen, onOpenChange, onUpdateSuccess
}: {
    record: GroupedResult | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdateSuccess: () => void;
}) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const canEdit = profile?.role === 'admin' || profile?.role === 'training_team';
    const [isEditMode, setIsEditMode] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();

    useEffect(() => { if (!isOpen) setIsEditMode(false); }, [isOpen]);
    if (!record) return null;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const recordId = record.completedCourses[0]?.id;
        if (!recordId) {
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่พบข้อมูลระเบียน' });
            return;
        }
        formData.append('recordId', recordId);
        startTransition(async () => {
            const result = await updateSingleAttendeeData(formData);
            if (result.success) {
                toast({ title: 'สำเร็จ', description: result.message });
                setIsEditMode(false);
                onUpdateSuccess();
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
        });
    };

    const handleDeleteDoc = (docUrl: string) => {
        if (!record.attendeeId) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้?')) return;
        startDeleteTransition(async () => {
            const result = await deleteAttendeeDocument(record.attendeeId!, docUrl);
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
                onUpdateSuccess();
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                <div className="relative w-24 h-24 shrink-0">
                                    <Image src={record.profilePicture || `https://placehold.co/200x200.png`} alt={record.attendeeName || 'Profile'} fill className="rounded-full object-cover" />
                                </div>
                                <div className="space-y-1 pt-2">
                                    <DialogTitle className="text-2xl">{record.attendeeName}</DialogTitle>
                                    <DialogDescription asChild>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1.5"><Building className="w-4 h-4" /> {record.companyName}</div>
                                            <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600" /> ผ่านการอบรม {record.completedCourses.length} หลักสูตร</div>
                                        </div>
                                    </DialogDescription>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    {isEditMode && <Button type="submit" size="sm" disabled={isPending}>{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}บันทึก</Button>}
                                    <Button type="button" size="sm" variant={isEditMode ? "secondary" : "default"} onClick={() => setIsEditMode(!isEditMode)}>
                                        {isEditMode ? "ยกเลิก" : <><Edit className="mr-2 h-4 w-4" />แก้ไขข้อมูล</>}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                        {/* Personal info */}
                        <div className="space-y-3">
                            <h4 className="font-semibold">ข้อมูลผู้เข้าอบรม</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm items-start pl-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="attendeeName">ชื่อ-นามสกุล</Label>
                                    {isEditMode ? <Input id="attendeeName" name="attendeeName" defaultValue={record.attendeeName} /> : <p className="text-muted-foreground">{record.attendeeName}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="companyName">บริษัท</Label>
                                    {isEditMode ? <Input id="companyName" name="companyName" defaultValue={record.companyName} /> : <p className="text-muted-foreground">{record.companyName}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="attendeeId">เลขบัตรประชาชน / Passport</Label>
                                    {isEditMode ? <Input id="attendeeId" name="attendeeId" defaultValue={record.attendeeId || ''} /> : <p className="text-muted-foreground">{record.attendeeId || '-'}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>วุฒิการศึกษา</Label>
                                    {isEditMode ? <Input id="education" name="education" defaultValue={record.education || ''} /> : <p className="text-muted-foreground">{record.education || '-'}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>วัน/เดือน/ปีเกิด</Label>
                                    {isEditMode ? <Input id="dateOfBirth" name="dateOfBirth" defaultValue={record.dateOfBirth || ''} placeholder="DD/MM/YYYY" /> : <p className="text-muted-foreground">{record.dateOfBirth || '-'}</p>}
                                </div>
                                {isEditMode && (
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="profilePicture" className="font-medium">รูปโปรไฟล์ใหม่</Label>
                                        <Input id="profilePicture" name="profilePicture" type="file" accept="image/*" />
                                        <p className="text-xs text-muted-foreground">เลือกไฟล์ใหม่เพื่ออัปเดต ถ้าไม่ต้องการเปลี่ยนให้เว้นว่างไว้</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Documents */}
                        <div className="space-y-3">
                            <h4 className="font-semibold">เอกสารแนบ</h4>
                            {(record.documents || []).length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {record.documents!.map((docItem) => (
                                        <div key={docItem.id || docItem.url} className="relative group/doc">
                                            <DocumentThumbnail fileUrl={docItem.url} fileName={docItem.name} />
                                            <div className="text-xs mt-1 space-y-0.5">
                                                <p className="truncate text-muted-foreground" title={docItem.name}>{docItem.name}</p>
                                                <p className="text-gray-400">อัปโหลด: {format(new Date(docItem.timestamp), 'd MMM yy', { locale: th })}</p>
                                            </div>
                                            {isEditMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDoc(docItem.url)}
                                                    disabled={isDeleting}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-600/80 text-white rounded-full opacity-0 group-hover/doc:opacity-100 transition-opacity hover:bg-red-700 disabled:bg-gray-400">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-muted-foreground italic text-sm">ไม่มีเอกสารแนบ</p>}
                        </div>
                        {isEditMode && record.attendeeId && <AttendeeDocumentUploader attendeeId={record.attendeeId} onUploadSuccess={onUpdateSuccess} />}

                        <Separator />

                        {/* Training history accordion */}
                        <div className="space-y-3">
                            <h3 className="font-semibold">ประวัติการผ่านการอบรม</h3>
                            <Accordion type="single" collapsible className="w-full">
                                {record.completedCourses.map((completion) => {
                                    const status = getExpiryStatus(completion.expiryDate);
                                    return (
                                        <AccordionItem value={completion.id} key={completion.id}>
                                            <AccordionTrigger>
                                                <div className="text-left flex-1 flex items-center justify-between pr-2">
                                                    <div>
                                                        <p className="font-semibold" title={completion.course?.title}>{completion.course?.shortName || completion.courseTitle}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            ผ่านการอบรมเมื่อ: {completion.completionDate ? format(parseISO(completion.completionDate), 'd MMM yyyy', { locale: th }) : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className={cn('gap-x-1.5 shrink-0', status.color)}>
                                                        <status.icon className="h-3.5 w-3.5" />{status.text}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pl-2">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="font-medium">วันที่ออกใบรับรอง</p>
                                                            <p className="text-muted-foreground">{completion.certificateIssueDate ? format(parseISO(completion.certificateIssueDate), 'd MMM yyyy', { locale: th }) : '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">วันหมดอายุ</p>
                                                            <p className="text-muted-foreground">{completion.expiryDate ? format(parseISO(completion.expiryDate), 'd MMM yyyy', { locale: th }) : 'ไม่มี'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">เลขที่ใบรับรอง</p>
                                                            <p className="text-muted-foreground font-mono">{completion.certificateId || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </div>
                    </div>
                    <DialogFooter className={isEditMode ? 'hidden' : ''}>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">ปิด</Button>
                        </DialogClose>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Attendee card ─────────────────────────────────────────────────────────────
function AttendeeCard({ record, onClick }: { record: GroupedResult; onClick: () => void }) {
    const coursePlurality = record.completedCourses.length;
    return (
        <Card
            className={cn(
                "cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col group",
                record.hasExpired && "border-red-200",
                record.hasExpiringSoon && !record.hasExpired && "border-amber-200"
            )}
            onClick={onClick}
        >
            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-3">
                <div className="relative w-14 h-14 shrink-0">
                    <Image
                        src={record.profilePicture || `https://placehold.co/200x200.png`}
                        alt={record.attendeeName}
                        fill
                        className="rounded-full object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{record.attendeeName}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-xs mt-0.5 truncate">
                        <Building className="h-3 w-3 shrink-0" />{record.companyName}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow pt-0 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>ผ่านการอบรม <span className="font-semibold text-foreground">{coursePlurality}</span> หลักสูตร</span>
                </div>
                {record.latestCompletion && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-6">
                        ล่าสุด: {format(parseISO(record.latestCompletion), 'd MMM yyyy', { locale: th })}
                    </p>
                )}
            </CardContent>
            <CardFooter className="pt-0 pb-3 gap-2 flex-wrap">
                {record.hasExpired && (
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 gap-1">
                        <ShieldX className="w-3 h-3" /> มีใบรับรองหมดอายุ
                    </Badge>
                )}
                {record.hasExpiringSoon && !record.hasExpired && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
                        <AlertTriangle className="w-3 h-3" /> ใกล้หมดอายุ
                    </Badge>
                )}
                {!record.hasExpired && !record.hasExpiringSoon && (
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ใบรับรองปกติ
                    </Badge>
                )}
            </CardFooter>
        </Card>
    );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <Skeleton className="w-14 h-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-3 w-full mt-2" />
                        <Skeleton className="h-3 w-2/3 mt-2" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ── Main page component ───────────────────────────────────────────────────────
export function HistoryClientPage({ courses, companies }: { courses: Course[]; companies: string[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const debouncedSearch = useDebounce(searchQuery, 400);

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<GroupedResult | null>(null);

    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [attendeesMap, setAttendeesMap] = useState<Record<string, AttendeeData>>({});
    const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
    const [hasMore, setHasMore] = useState(true);
    const [lastVisibleId, setLastVisibleId] = useState<string | undefined>(undefined);

    const loaderRef = useRef<HTMLDivElement>(null);
    const isActiveFilters = companyFilter !== 'all' || courseFilter !== 'all' || yearFilter !== 'all' || !!debouncedSearch;

    const loadRecords = useCallback(async (isNewSearch: boolean) => {
        if (!isNewSearch && (isLoadingMore || !hasMore)) return;

        if (isNewSearch) {
            setIsLoading(true);
            setRecords([]);
            setAttendeesMap({});
            setCoursesMap({});
            setHasMore(true);
            setLastVisibleId(undefined);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const yearNum = yearFilter !== 'all' ? parseInt(yearFilter) : undefined;
            const result = await getPaginatedHistory({
                searchQuery: debouncedSearch,
                companyFilter,
                courseFilter,
                yearFilter: yearNum,
                lastVisibleId: isNewSearch ? undefined : lastVisibleId,
            });

            setRecords(prev => isNewSearch ? result.records : [...prev, ...result.records]);
            setAttendeesMap(prev => ({ ...prev, ...result.attendeesMap }));
            setCoursesMap(prev => ({ ...prev, ...result.coursesMap }));
            setHasMore(result.hasMore);
            setLastVisibleId(result.lastVisibleId || undefined);
        } catch (e) {
            setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, debouncedSearch, companyFilter, courseFilter, yearFilter, lastVisibleId]);

    // Reload on filter change
    useEffect(() => {
        loadRecords(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, companyFilter, courseFilter, yearFilter]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
                    loadRecords(false);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore, loadRecords]);

    const groupedRecords = useMemo<GroupedResult[]>(() => {
        const groups: Record<string, GroupedResult> = {};
        for (const record of records) {
            const key = record.attendeeId || `${record.attendeeName}-${record.companyName}`;
            if (!groups[key]) {
                const profile = record.attendeeId ? attendeesMap[record.attendeeId] : undefined;
                groups[key] = {
                    id: key,
                    attendeeName: record.attendeeName,
                    companyName: record.companyName,
                    attendeeId: record.attendeeId,
                    profilePicture: profile?.profilePicture,
                    education: profile?.education,
                    dateOfBirth: profile?.dateOfBirth,
                    documents: profile?.documents,
                    completedCourses: [],
                    latestCompletion: '',
                    hasExpired: false,
                    hasExpiringSoon: false,
                };
            }

            // Refresh profile data if available
            if (record.attendeeId && attendeesMap[record.attendeeId]) {
                const p = attendeesMap[record.attendeeId];
                groups[key].profilePicture = p.profilePicture;
                groups[key].education = p.education;
                groups[key].dateOfBirth = p.dateOfBirth;
                groups[key].documents = p.documents;
            }

            const course = coursesMap[record.courseId];
            if (!groups[key].completedCourses.some(c => c.id === record.id)) {
                groups[key].completedCourses.push({ ...record, course });
            }

            // Update latest completion
            if (record.completionDate && record.completionDate > groups[key].latestCompletion) {
                groups[key].latestCompletion = record.completionDate;
            }

            // Check expiry flags
            if (record.expiryDate) {
                const days = differenceInDays(parseISO(record.expiryDate), new Date());
                if (days < 0) groups[key].hasExpired = true;
                else if (days <= 90) groups[key].hasExpiringSoon = true;
            }
        }
        return Object.values(groups).sort((a, b) => {
            // Sort by latest completion desc
            if (b.latestCompletion !== a.latestCompletion)
                return b.latestCompletion.localeCompare(a.latestCompletion);
            return a.attendeeName.localeCompare(b.attendeeName);
        });
    }, [records, attendeesMap, coursesMap]);

    // Stats
    const stats = useMemo(() => ({
        total: groupedRecords.length,
        expired: groupedRecords.filter(r => r.hasExpired).length,
        expiringSoon: groupedRecords.filter(r => r.hasExpiringSoon && !r.hasExpired).length,
    }), [groupedRecords]);

    const clearFilters = () => {
        setSearchQuery('');
        setCompanyFilter('all');
        setCourseFilter('all');
        setYearFilter('all');
    };

    return (
        <>
            <div className="space-y-4">
                {/* Stats dashboard */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-blue-50/50 border-blue-100">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-100"><Users className="w-5 h-5 text-blue-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-blue-900">{stats.total.toLocaleString('th-TH')}</p>
                                <p className="text-xs text-blue-600 font-medium">ผู้ผ่านการอบรม (หน้านี้)</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50/50 border-amber-100">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-100"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-amber-900">{stats.expiringSoon.toLocaleString('th-TH')}</p>
                                <p className="text-xs text-amber-600 font-medium">ใกล้หมดอายุ (90 วัน)</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50/50 border-red-100">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-100"><ShieldX className="w-5 h-5 text-red-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-red-900">{stats.expired.toLocaleString('th-TH')}</p>
                                <p className="text-xs text-red-600 font-medium">ใบรับรองหมดอายุ</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-end">
                            {isActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                                    <FilterX className="w-4 h-4 mr-1.5" /> ล้างตัวกรอง
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                            <div className="relative sm:col-span-2 lg:col-span-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ค้นหาชื่อ, บริษัท..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                <SelectTrigger><SelectValue placeholder="ทุกบริษัท" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกบริษัท</SelectItem>
                                    {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={courseFilter} onValueChange={setCourseFilter}>
                                <SelectTrigger><SelectValue placeholder="ทุกหลักสูตร" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                                    {courses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.shortName || c.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={yearFilter} onValueChange={setYearFilter}>
                                <SelectTrigger><SelectValue placeholder="ทุกปี" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกปี</SelectItem>
                                    {YEAR_OPTIONS.map(y => (
                                        <SelectItem key={y.value} value={String(y.value)}>พ.ศ. {y.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {isLoading && groupedRecords.length === 0 ? (
                            <LoadingSkeleton />
                        ) : error ? (
                            <div className="h-48 flex items-center justify-center text-destructive border-2 border-dashed rounded-lg">
                                เกิดข้อผิดพลาด: {error}
                            </div>
                        ) : groupedRecords.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedRecords.map((record) => (
                                    <AttendeeCard
                                        key={record.id}
                                        record={record}
                                        onClick={() => setSelectedRecord(record)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg gap-2">
                                <BookOpen className="w-8 h-8 opacity-40" />
                                <p>ไม่พบข้อมูลประวัติการอบรมที่ตรงกับเงื่อนไข</p>
                                {isActiveFilters && (
                                    <Button variant="link" size="sm" onClick={clearFilters}>ล้างตัวกรอง</Button>
                                )}
                            </div>
                        )}

                        {/* Infinite scroll sentinel */}
                        <div ref={loaderRef} className="mt-6 flex justify-center">
                            {isLoadingMore && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">กำลังโหลดเพิ่มเติม...</span>
                                </div>
                            )}
                            {!hasMore && groupedRecords.length > 0 && (
                                <p className="text-xs text-muted-foreground">แสดงทั้งหมด {groupedRecords.length.toLocaleString('th-TH')} รายการ</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <HistoryDetailsDialog
                record={selectedRecord}
                isOpen={!!selectedRecord}
                onOpenChange={(open) => !open && setSelectedRecord(null)}
                onUpdateSuccess={() => {
                    setSelectedRecord(null);
                    loadRecords(true);
                }}
            />
        </>
    );
}
