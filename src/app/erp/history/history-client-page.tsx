

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef, useTransition } from 'react';
import type { TrainingRecord, AttendeeData, Course, AdditionalDoc } from '@/lib/course-data';
import { format, differenceInDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShieldCheck, User, Building, Briefcase, CalendarCheck, AlertTriangle, ShieldX, Infinity, Edit, Save, Loader2, Trash2, Home } from 'lucide-react';
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
  id: string; // Combination of attendeeName and companyName
  attendeeName: string;
  companyName: string;
  attendeeId: string | null;
  profilePicture?: string;
  education?: string;
  dateOfBirth?: string;
  documents?: AdditionalDoc[];
  completedCourses: (TrainingRecord & { course?: Course })[];
}

function AttendeeDocumentUploader({ attendeeId, onUploadSuccess }: { attendeeId: string, onUploadSuccess: () => void }) {
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
            if (fileInputRef.current) {
                 fileInputRef.current.value = '';
            }
        });
    };

    return (
        <div className="flex items-center gap-2 pt-2">
            <label htmlFor={`file-upload-${attendeeId}`} className={cn(buttonVariants({variant: 'outline'}), "w-full cursor-pointer")}>
                <FileUp className="mr-2 h-4 w-4" />
                แนบเอกสารประจำตัว
                <input id={`file-upload-${attendeeId}`} ref={fileInputRef} type="file" className="sr-only" onChange={handleFileUpload} disabled={isUploading}/>
            </label>
            {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
    );
}

const getStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) {
        return { text: 'ตลอดชีพ', color: 'bg-blue-100 text-blue-800', icon: Infinity };
    }
    const now = new Date();
    try {
        const expiry = parseISO(expiryDate);
        const daysUntilExpiry = differenceInDays(expiry, now);

        if (daysUntilExpiry < 0) {
            return { text: 'หมดอายุ', color: 'bg-red-100 text-red-800', icon: ShieldX };
        }
        if (daysUntilExpiry <= 90) {
            return { text: `ใกล้หมดอายุ (${daysUntilExpiry} วัน)`, color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
        }
        return { text: 'ยังไม่หมดอายุ', color: 'bg-green-100 text-green-800', icon: ShieldCheck };
    } catch (error) {
        console.error("Invalid date format for expiryDate:", expiryDate, error);
        return { text: 'ข้อมูลผิดพลาด', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
};

function HistoryDetailsDialog({ 
    record, 
    isOpen, 
    onOpenChange, 
    onUpdateSuccess 
}: { 
    record: GroupedResult | null, 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void, 
    onUpdateSuccess: () => void 
}) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const canEdit = profile?.role === 'admin' || profile?.role === 'training_team';

    const [isEditMode, setIsEditMode] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();

    useEffect(() => {
        // Reset edit mode when dialog is closed or record changes
        if (!isOpen) {
            setIsEditMode(false);
        }
    }, [isOpen]);

    if (!record) return null;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        const recordId = record.completedCourses[0]?.id;
        if (!recordId) {
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่พบข้อมูลระเบียนการอบรมที่สามารถใช้อ้างอิงได้' });
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
                                            <div className="flex items-center gap-1.5"><Building className="w-4 h-4"/> {record.companyName}</div>
                                            <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600"/> ผ่านการอบรม {record.completedCourses.length} หลักสูตร</div>
                                        </div>
                                    </DialogDescription>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    {isEditMode && <Button type="submit" size="sm" disabled={isPending}>{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}บันทึก</Button>}
                                    <Button type="button" size="sm" variant={isEditMode ? "secondary" : "default"} onClick={() => setIsEditMode(!isEditMode)}>
                                        {isEditMode ? "ยกเลิก" : <><Edit className="mr-2 h-4 w-4"/>แก้ไขข้อมูล</>}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
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
                                {isEditMode && 
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="profilePicture" className="font-medium">รูปโปรไฟล์ใหม่</Label>
                                        <Input id="profilePicture" name="profilePicture" type="file" accept="image/*" />
                                        <p className="text-xs text-muted-foreground">เลือกไฟล์ใหม่เพื่ออัปเดต ถ้าไม่ต้องการเปลี่ยนให้เว้นว่างไว้</p>
                                    </div>
                                }
                            </div>
                        </div>

                         <Separator />
                         <div className="space-y-3">
                            <h4 className="font-semibold">เอกสารแนบ</h4>
                            {(record.documents || []).length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {record.documents!.map((doc) => (
                                        <div key={doc.id || doc.url} className="relative group/doc">
                                            <DocumentThumbnail fileUrl={doc.url} fileName={doc.name} />
                                            <div className="text-xs mt-1 space-y-0.5">
                                                <p className="truncate text-muted-foreground" title={doc.name}>{doc.name}</p>
                                                <p className="text-gray-400">อัปโหลด: {format(new Date(doc.timestamp), 'd MMM yy', { locale: th })}</p>
                                            </div>
                                            {isEditMode && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteDoc(doc.url)}
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
                        <div className="space-y-3">
                            <h3 className="font-semibold">ประวัติการผ่านการอบรม</h3>
                            <Accordion type="single" collapsible className="w-full">
                                {record.completedCourses.map((completion) => {
                                    const status = getStatus(completion.expiryDate);
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
                                                    <Badge variant="outline" className={cn('gap-x-1.5', status.color)}>
                                                        <status.icon className="h-3.5 w-3.5"/>{status.text}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pl-2">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="font-medium">วันที่ออกใบรับรอง</p>
                                                            <p className="text-muted-foreground">{completion.certificateIssueDate ? format(parseISO(completion.certificateIssueDate), 'd MMM yyyy', {locale: th}) : '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">วันหมดอายุ</p>
                                                            <p className="text-muted-foreground">{completion.expiryDate ? format(parseISO(completion.expiryDate), 'd MMM yyyy', {locale: th}) : 'ไม่มี'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">เลขที่ใบรับรอง</p>
                                                            <p className="text-muted-foreground">{completion.certificateId || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
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
    )
}

function LoadingSkeleton() {
    return (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                 <Card key={i}>
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-4/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mt-4" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}


export function HistoryClientPage({ uniqueCompanies }: { uniqueCompanies: string[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<GroupedResult | null>(null);
    
    // States for pagination
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [attendeesMap, setAttendeesMap] = useState<Record<string, AttendeeData>>({});
    const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
    const [hasMore, setHasMore] = useState(true);
    const [lastVisibleId, setLastVisibleId] = useState<string | undefined>(undefined);
    
    const loaderRef = useRef<HTMLDivElement>(null);


    const loadRecords = useCallback(async (isNewSearch: boolean) => {
        if (isLoading && !isNewSearch) return;
        setIsLoading(true);
        if (isNewSearch) {
             setRecords([]);
             setAttendeesMap({});
             setCoursesMap({});
             setHasMore(true);
             setLastVisibleId(undefined);
        }

        try {
            const result = await getPaginatedHistory({ 
                searchQuery: debouncedSearch,
                companyFilter: companyFilter,
                lastVisibleId: isNewSearch ? undefined : lastVisibleId
            });

            setRecords(prev => isNewSearch ? result.records : [...prev, ...result.records]);
            setAttendeesMap(prev => ({...prev, ...result.attendeesMap}));
            setCoursesMap(prev => ({...prev, ...result.coursesMap}));
            setHasMore(result.hasMore);
            setLastVisibleId(result.lastVisibleId || undefined);

        } catch (e) {
            setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, debouncedSearch, companyFilter, lastVisibleId]);


    // Initial load
    useEffect(() => {
        loadRecords(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, companyFilter]);


    const groupedRecords = useMemo(() => {
        const groups: Record<string, GroupedResult> = {};
        for (const record of records) {
            const uniqueKey = record.attendeeId || `${record.attendeeName}-${record.companyName}`;
            if (!groups[uniqueKey]) {
                const attendeeProfile = record.attendeeId ? attendeesMap[record.attendeeId] : undefined;
                groups[uniqueKey] = {
                    id: uniqueKey,
                    attendeeName: record.attendeeName,
                    companyName: record.companyName,
                    attendeeId: record.attendeeId,
                    profilePicture: attendeeProfile?.profilePicture,
                    education: attendeeProfile?.education,
                    dateOfBirth: attendeeProfile?.dateOfBirth,
                    documents: attendeeProfile?.documents,
                    completedCourses: []
                };
            }
            if (record.attendeeId && attendeesMap[record.attendeeId] && !groups[uniqueKey].profilePicture) {
                const attendeeProfile = attendeesMap[record.attendeeId];
                groups[uniqueKey].profilePicture = attendeeProfile.profilePicture;
                groups[uniqueKey].education = attendeeProfile.education;
                groups[uniqueKey].dateOfBirth = attendeeProfile.dateOfBirth;
                groups[uniqueKey].documents = attendeeProfile.documents;
            }
             if (record.attendeeId && attendeesMap[record.attendeeId]) {
                 groups[uniqueKey].documents = attendeesMap[record.attendeeId].documents;
            }

            const course = coursesMap[record.courseId];
            if (course && !groups[uniqueKey].completedCourses.some(c => c.id === record.id)) {
                groups[uniqueKey].completedCourses.push({ ...record, course });
            }
        }
        return Object.values(groups).sort((a, b) => a.attendeeName.localeCompare(b.attendeeName));
    }, [records, attendeesMap, coursesMap]);
    
    return (
      <>
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>ประวัติการอบรม</CardTitle>
                        <CardDescription>
                            ค้นหาและตรวจสอบประวัติผู้ที่ผ่านการอบรมทั้งหมด
                        </CardDescription>
                    </div>
                     <div className="text-lg font-semibold">
                        พบ {groupedRecords.length.toLocaleString('th-TH')} รายการ
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ค้นหาชื่อผู้อบรม, บริษัท..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="กรองตามบริษัท" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทุกบริษัท</SelectItem>
                            {uniqueCompanies.map((company) => (
                                <SelectItem key={company} value={company}>
                                    {company}
                                </SelectItem>
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
                                <Card 
                                    key={record.id} 
                                    className="cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col"
                                    onClick={() => setSelectedRecord(record)}
                                >
                                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                                        <div className="relative w-16 h-16 shrink-0">
                                            <Image src={record.profilePicture || `https://placehold.co/200x200.png`} alt={record.attendeeName} fill className="rounded-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{record.attendeeName}</CardTitle>
                                            <CardDescription className="flex items-center gap-1.5 text-xs mt-1"><Building className="h-3 w-3"/>{record.companyName}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                         <div className="text-sm text-muted-foreground flex items-start gap-2">
                                            <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/>
                                            <span>
                                                ผ่านการอบรม {record.completedCourses.length} หลักสูตร
                                            </span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Badge variant="secondary">ดูรายละเอียด</Badge>
                                    </CardFooter>
                                </Card>
                        ))}
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                        ไม่พบข้อมูลประวัติการอบรมที่ตรงกับเงื่อนไข
                    </div>
                )}
            </CardContent>
             {hasMore && (
                <CardFooter className="justify-center py-4">
                    <Button onClick={() => loadRecords(false)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'โหลดเพิ่มเติม'}
                    </Button>
                </CardFooter>
            )}
        </Card>
        
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
