'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { TrainingRecord, AttendeeData, Course } from '@/lib/course-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Building, ShieldCheck, Loader2, Award } from 'lucide-react';
import Image from 'next/image';
import { useDebounce } from '@/hooks/use-debounce';
import { getPaginatedHistory } from '@/app/erp/history/actions';
import { Skeleton } from '@/components/ui/skeleton';

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
    )
}

export function HistoryClientPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [attendeesMap, setAttendeesMap] = useState<Record<string, AttendeeData>>({});
    const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
    
    const hasSearched = useRef(false);

    const loadRecords = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setRecords([]);
            setIsLoading(false);
            hasSearched.current = false;
            return;
        }

        hasSearched.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const result = await getPaginatedHistory({ 
                searchQuery: query,
                companyFilter: 'all',
            });

            setRecords(result.records);
            setAttendeesMap(result.attendeesMap);
            setCoursesMap(result.coursesMap);

        } catch (e) {
            setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
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
                    completedCourses: []
                };
            }
            const course = coursesMap[record.courseId];
            if (course) {
                if (!groups[uniqueKey].completedCourses.some(c => c.courseId === course.id)) {
                    groups[uniqueKey].completedCourses.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        courseShortName: course.shortName,
                        completionDate: record.completionDate
                    });
                }
            }
        }
        return Object.values(groups).sort((a,b) => a.attendeeName.localeCompare(b.attendeeName));
    }, [records, attendeesMap, coursesMap]);


    return (
        <div className="py-12 md:py-24">
            <div className="text-center mb-16 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6 border border-primary/20">
                    <Award className="w-4 h-4" />
                    ระบบตรวจสอบวุฒิบัตรมาตรฐาน
                </div>
                <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-6">
                    ตรวจสอบประวัติ<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">การผ่านการอบรม</span>
                </h1>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                   พิมพ์ชื่อ-นามสกุล หรือชื่อบริษัท เพื่อตรวจสอบความถูกต้องของวุฒิบัตรและประวัติการเรียนรู้ของบุคลากรในระบบของเราครับ
                </p>
            </div>

            <div className="max-w-2xl mx-auto mb-16 px-4">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                        <Input
                            placeholder="ค้นหาชื่อ-นามสกุล หรือชื่อบริษัท..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-14 h-16 text-lg rounded-[1.5rem] border-none shadow-2xl focus-visible:ring-primary/20"
                        />
                    </div>
                </div>
                <p className="text-center mt-4 text-xs text-muted-foreground font-medium uppercase tracking-widest">ระบบจะเริ่มค้นหาเมื่อพิมพ์มากกว่า 2 ตัวอักษร</p>
            </div>

            <div className="container mx-auto px-4">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : error ? (
                    <div className="text-center py-20 bg-destructive/5 rounded-[2.5rem] border-2 border-dashed border-destructive/20">
                        <p className="text-destructive font-bold">เกิดข้อผิดพลาด: {error}</p>
                    </div>
                ) : hasSearched.current ? (
                    groupedRecords.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {groupedRecords.map((record) => (
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
                                                <Building className="h-3.5 w-3.5 text-primary"/>
                                                {record.companyName}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow p-8">
                                        <h4 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-primary rounded-full" />
                                            หลักสูตรที่ได้รับรอง
                                        </h4>
                                        <div className="space-y-3">
                                        {record.completedCourses.map(course => (
                                            <div key={course.courseId} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-colors">
                                                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5"/>
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
        </div>
    );
}
