'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { TrainingRecord, AttendeeData, Course, Registration } from '@/lib/course-data';
import { useAuth } from '@/context/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Search, Building, ShieldCheck, Loader2, Award, User,
    Clock, CheckCircle, XCircle, GraduationCap, CalendarDays,
    ClipboardList, FileText, ArrowRight, Infinity as InfinityIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { getPaginatedHistory } from '@/app/erp/history/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { User as FirebaseUser } from 'firebase/auth';

// ─────────────────────────────────────────────
//  Shared types
// ─────────────────────────────────────────────

interface GroupedResult {
    id: string;
    attendeeName: string;
    companyName: string;
    attendeeId: string | null;
    profilePicture?: string;
    completedCourses: {
        courseId: string;
        courseTitle: string;
        courseShortName?: string;
        completionDate: string;
    }[];
}

const registrationStatusConfig: Record<Registration['status'], { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: 'รอตรวจสอบ', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', icon: Clock },
    confirmed: { label: 'ยืนยันแล้ว', className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: XCircle },
};

// ─────────────────────────────────────────────
//  Skeletons
// ─────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="rounded-[2rem]">
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-4/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mt-4" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-[2rem]" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-[2rem]" />
        </div>
    );
}

// ─────────────────────────────────────────────
//  Certificate expiry badge
// ─────────────────────────────────────────────

function ExpiryBadge({ expiryDate }: { expiryDate?: string | null }) {
    if (expiryDate === null || expiryDate === undefined) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                <InfinityIcon className="h-3.5 w-3.5" /> ไม่มีวันหมดอายุ
            </span>
        );
    }
    const daysLeft = differenceInDays(parseISO(expiryDate), new Date());
    const isExpired = daysLeft < 0;
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= 60;

    return (
        <span className={cn(
            "inline-flex items-center gap-1 text-xs font-bold",
            isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-500" : "text-green-600 dark:text-green-400"
        )}>
            <CalendarDays className="h-3.5 w-3.5" />
            {isExpired
                ? `หมดอายุแล้ว (${format(parseISO(expiryDate), 'd MMM yyyy', { locale: th })})`
                : `หมดอายุ ${format(parseISO(expiryDate), 'd MMM yyyy', { locale: th })}`}
        </span>
    );
}

// ─────────────────────────────────────────────
//  Personal History Dashboard
// ─────────────────────────────────────────────

function PersonalHistoryDashboard({ user }: { user: FirebaseUser }) {
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');

    // Real-time registrations for this user
    const regQuery = useMemoFirebase(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'registrations'),
            where('userId', '==', user.uid),
            orderBy('registrationDate', 'desc')
        );
    }, [user?.uid, firestore]);

    const { data: registrationsRaw, isLoading: regLoading } = useCollection<Registration>(regQuery);
    const registrations = registrationsRaw ?? [];

    // Real-time training records for those registrations
    const regIds = useMemo(() => registrations.map(r => r.id).slice(0, 30), [registrations]);

    const recordsQuery = useMemoFirebase(() => {
        if (regIds.length === 0 || !firestore) return null;
        return query(
            collection(firestore, 'trainingRecords'),
            where('registrationId', 'in', regIds)
        );
    }, [regIds, firestore]);

    const { data: trainingRecordsRaw, isLoading: recordsLoading } = useCollection<TrainingRecord>(recordsQuery);
    const trainingRecords = trainingRecordsRaw ?? [];

    const completedRecords = useMemo(() => trainingRecords.filter(r => r.passedTraining), [trainingRecords]);

    const isLoading = regLoading || recordsLoading;

    // Client-side search
    const filteredRegistrations = useMemo(() => {
        if (!searchQuery.trim()) return registrations;
        const q = searchQuery.toLowerCase();
        return registrations.filter(r =>
            r.courseTitle?.toLowerCase().includes(q) ||
            r.clientCompanyName?.toLowerCase().includes(q)
        );
    }, [registrations, searchQuery]);

    const filteredCertificates = useMemo(() => {
        if (!searchQuery.trim()) return completedRecords;
        const q = searchQuery.toLowerCase();
        return completedRecords.filter(r =>
            r.courseTitle?.toLowerCase().includes(q) ||
            r.attendeeName?.toLowerCase().includes(q) ||
            r.companyName?.toLowerCase().includes(q)
        );
    }, [completedRecords, searchQuery]);

    const companyName = registrations[0]?.clientCompanyName || '';

    if (isLoading) return <DashboardSkeleton />;

    return (
        <div className="py-12 md:py-20 space-y-10">
            {/* Header */}
            <div className="relative rounded-[2rem] bg-slate-950 text-white p-8 md:p-10 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-white/10 shadow-2xl rounded-3xl">
                        <AvatarImage src={user.photoURL ?? ''} className="object-cover" />
                        <AvatarFallback className="bg-primary/20 text-3xl rounded-3xl">
                            <User className="h-12 w-12" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left space-y-2 flex-grow">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
                            <Award className="w-3.5 h-3.5" /> ประวัติการอบรมของฉัน
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{user.displayName}</h1>
                        {companyName && (
                            <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2 text-sm">
                                <Building className="w-4 h-4 text-primary/70" /> {companyName}
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto md:shrink-0">
                        {[
                            { label: 'การสมัคร', value: registrations.length, icon: FileText },
                            { label: 'วุฒิบัตร', value: completedRecords.length, icon: GraduationCap },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/5 rounded-2xl p-4 text-center">
                                <stat.icon className="h-5 w-5 text-primary/70 mx-auto mb-1" />
                                <p className="text-2xl font-black">{stat.value}</p>
                                <p className="text-xs text-slate-400 font-light">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="ค้นหาหลักสูตร, บริษัท, ชื่อผู้เข้าอบรม..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="registrations">
                <TabsList className="mb-6">
                    <TabsTrigger value="registrations" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        การสมัครอบรม
                        <Badge variant="secondary" className="ml-1 text-xs">{registrations.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="certificates" className="gap-2">
                        <GraduationCap className="h-4 w-4" />
                        วุฒิบัตรของฉัน
                        <Badge variant="secondary" className="ml-1 text-xs">{completedRecords.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Registrations Tab */}
                <TabsContent value="registrations">
                    {filteredRegistrations.length === 0 ? (
                        <div className="text-center py-20 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20">
                            <ClipboardList className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                            {registrations.length === 0 ? (
                                <>
                                    <h3 className="text-xl font-bold text-slate-500">ยังไม่มีประวัติการสมัครอบรม</h3>
                                    <p className="text-slate-400 mt-2 font-light text-sm">เริ่มต้นอบรมด้วยการเลือกหลักสูตรที่คุณสนใจครับ</p>
                                    <Button asChild className="mt-6 rounded-2xl">
                                        <Link href="/courses">ดูหลักสูตรทั้งหมด <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </>
                            ) : (
                                <h3 className="text-xl font-bold text-slate-500">ไม่พบผลการค้นหา</h3>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRegistrations.map(reg => {
                                const cfg = registrationStatusConfig[reg.status];
                                const StatusIcon = cfg.icon;
                                const records = trainingRecords.filter(r => r.registrationId === reg.id);
                                const completed = records.filter(r => r.passedTraining).length;
                                return (
                                    <Card key={reg.id} className="rounded-[1.5rem] border-none shadow-md hover:shadow-xl transition-all duration-300">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <Badge className={cn('font-semibold border text-xs px-2.5 py-0.5', cfg.className)}>
                                                            <StatusIcon className="mr-1 h-3 w-3" />
                                                            {cfg.label}
                                                        </Badge>
                                                        {completed > 0 && (
                                                            <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 font-semibold border text-xs px-2.5 py-0.5">
                                                                <GraduationCap className="mr-1 h-3 w-3" />
                                                                {completed} วุฒิบัตร
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="font-bold text-lg leading-tight truncate">{reg.courseTitle}</h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Building className="h-3.5 w-3.5" /> {reg.clientCompanyName || '—'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <CalendarDays className="h-3.5 w-3.5" />
                                                            {reg.registrationDate
                                                                ? format(parseISO(reg.registrationDate), 'd MMM yyyy', { locale: th })
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Certificates Tab */}
                <TabsContent value="certificates">
                    {filteredCertificates.length === 0 ? (
                        <div className="text-center py-20 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20">
                            <GraduationCap className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                            {completedRecords.length === 0 ? (
                                <>
                                    <h3 className="text-xl font-bold text-slate-500">ยังไม่มีวุฒิบัตร</h3>
                                    <p className="text-slate-400 mt-2 font-light text-sm">วุฒิบัตรจะปรากฏที่นี่หลังจากผ่านการอบรมแล้วครับ</p>
                                </>
                            ) : (
                                <h3 className="text-xl font-bold text-slate-500">ไม่พบผลการค้นหา</h3>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCertificates.map(record => (
                                <Card key={record.id} className="flex flex-col rounded-[1.5rem] border-none shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                                    <CardHeader className="p-6 pb-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 rounded-xl bg-green-500/10 shrink-0">
                                                <ShieldCheck className="h-6 w-6 text-green-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="text-base font-bold leading-snug line-clamp-2">{record.courseTitle}</CardTitle>
                                                <CardDescription className="mt-1 text-xs">{record.attendeeName}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow p-6 space-y-3">
                                        <div className="text-xs space-y-2">
                                            {record.completionDate && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                                    ผ่านการอบรม: {format(parseISO(record.completionDate), 'd MMM yyyy', { locale: th })}
                                                </div>
                                            )}
                                            <div>
                                                <ExpiryBadge expiryDate={record.expiryDate} />
                                            </div>
                                            {record.certificateId && (
                                                <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px]">
                                                    <Award className="h-3.5 w-3.5 shrink-0" />
                                                    {record.certificateId}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0">
                                        <div className="w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-center text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-widest">
                                            Verified ✓
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Separator />

            {/* Public lookup teaser */}
            <div className="text-center py-8">
                <p className="text-sm text-muted-foreground font-light mb-3">ต้องการตรวจสอบประวัติของผู้อื่น?</p>
                <Button variant="outline" className="rounded-2xl" onClick={() => {
                    document.getElementById('public-lookup')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                    <Search className="mr-2 h-4 w-4" />
                    ค้นหาประวัติผู้อื่น
                </Button>
            </div>

            {/* Public lookup section for logged-in users too */}
            <div id="public-lookup">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    ตรวจสอบวุฒิบัตรผู้อื่น
                </h2>
                <PublicLookupSection />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
//  Public Lookup Section (reusable)
// ─────────────────────────────────────────────

function PublicLookupSection() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [attendeesMap, setAttendeesMap] = useState<Record<string, AttendeeData>>({});
    const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
    const hasSearched = useRef(false);

    const loadRecords = useCallback(async (q: string) => {
        if (!q || q.length < 2) {
            setRecords([]);
            setIsLoading(false);
            hasSearched.current = false;
            return;
        }
        hasSearched.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const result = await getPaginatedHistory({ searchQuery: q, companyFilter: 'all' });
            setRecords(result.records);
            setAttendeesMap(result.attendeesMap);
            setCoursesMap(result.coursesMap);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecords(debouncedSearch);
    }, [debouncedSearch, loadRecords]);

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
                    completedCourses: [],
                };
            }
            const course = coursesMap[record.courseId];
            if (course && !groups[uniqueKey].completedCourses.some(c => c.courseId === course.id)) {
                groups[uniqueKey].completedCourses.push({
                    courseId: course.id,
                    courseTitle: course.title,
                    courseShortName: course.shortName,
                    completionDate: record.completionDate,
                });
            }
        }
        return Object.values(groups).sort((a, b) => a.attendeeName.localeCompare(b.attendeeName));
    }, [records, attendeesMap, coursesMap]);

    return (
        <div>
            <div className="max-w-2xl mb-12">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                        <Input
                            placeholder="ค้นหาชื่อ-นามสกุล หรือชื่อบริษัท..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-14 h-16 text-lg rounded-[1.5rem] border-none shadow-2xl focus-visible:ring-primary/20"
                        />
                    </div>
                </div>
                <p className="text-center mt-4 text-xs text-muted-foreground font-medium uppercase tracking-widest">ระบบจะเริ่มค้นหาเมื่อพิมพ์มากกว่า 2 ตัวอักษร</p>
            </div>

            {isLoading ? (
                <LoadingSkeleton />
            ) : error ? (
                <div className="text-center py-20 bg-destructive/5 rounded-[2.5rem] border-2 border-dashed border-destructive/20">
                    <p className="text-destructive font-bold">เกิดข้อผิดพลาด: {error}</p>
                </div>
            ) : hasSearched.current ? (
                groupedRecords.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {groupedRecords.map(record => (
                            <Card key={record.id} className="flex flex-col border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden group">
                                <CardHeader className="flex-row items-center gap-5 space-y-0 p-8 pb-6 bg-slate-50 dark:bg-slate-900/50">
                                    <div className="relative w-20 h-20 shrink-0 shadow-lg rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800">
                                        <Image
                                            src={record.profilePicture || `https://picsum.photos/seed/${record.id}/200/200`}
                                            alt={record.attendeeName}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-xl font-bold truncate group-hover:text-primary transition-colors">{record.attendeeName}</CardTitle>
                                        <CardDescription className="flex items-center gap-1.5 text-sm mt-1 font-medium truncate">
                                            <Building className="h-3.5 w-3.5 text-primary" />{record.companyName}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow p-8">
                                    <h4 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary rounded-full" />หลักสูตรที่ได้รับรอง
                                    </h4>
                                    <div className="space-y-3">
                                        {record.completedCourses.map(course => (
                                            <div key={course.courseId} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-colors">
                                                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate leading-tight" title={course.courseTitle}>{course.courseShortName || course.courseTitle}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">อบรมเมื่อ: {new Date(course.completionDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="px-8 pb-8 pt-0">
                                    <div className="w-full py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-center text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-widest">
                                        Verified Record
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-slate-50 dark:bg-slate-950/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-400">ไม่พบข้อมูลที่ตรงกัน</h3>
                        <p className="text-slate-400 mt-2 font-light">โปรดตรวจสอบตัวสะกด หรือลองค้นหาด้วยชื่ออื่นครับ</p>
                    </div>
                )
            ) : (
                <div className="text-center py-24 bg-primary/5 rounded-[3rem] border-2 border-dashed border-primary/20">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-primary">ระบบฐานข้อมูลความปลอดภัย</h3>
                    <p className="text-slate-500 mt-2 font-light max-w-sm mx-auto">ระบุชื่อหรือบริษัทเพื่อเริ่มต้นตรวจสอบประวัติความปลอดภัยของบุคลากรครับ</p>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
//  Public page (guests)
// ─────────────────────────────────────────────

export function HistoryClientPage() {
    return (
        <div className="py-12 md:py-24">
            <div className="text-center mb-16 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6 border border-primary/20">
                    <Award className="w-4 h-4" />
                    ระบบตรวจสอบวุฒิบัตรมาตรฐาน
                </div>
                <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-6">
                    ตรวจสอบประวัติ<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">การผ่านการอบรม</span>
                </h1>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                    พิมพ์ชื่อ-นามสกุล หรือชื่อบริษัท เพื่อตรวจสอบความถูกต้องของวุฒิบัตรและประวัติการเรียนรู้ของบุคลากรในระบบของเราครับ
                </p>
            </div>
            <div className="container mx-auto px-4">
                <PublicLookupSection />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
//  Router — entry point used by page.tsx
// ─────────────────────────────────────────────

export function TrainingHistoryRouter() {
    const { user, customerProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="py-20 container mx-auto px-4">
                <DashboardSkeleton />
            </div>
        );
    }

    // Logged-in customer → personal dashboard
    if (user && customerProfile) {
        return (
            <div className="container mx-auto px-4">
                <PersonalHistoryDashboard user={user} />
            </div>
        );
    }

    // Guest / staff → public certificate lookup
    return <HistoryClientPage />;
}
