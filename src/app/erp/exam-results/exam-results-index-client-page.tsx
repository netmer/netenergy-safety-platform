'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TrainingSchedule, Course } from '@/lib/course-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarChart2, Search, ChevronRight, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

function formatDateRange(start: string, end: string) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (s.toDateString() === e.toDateString()) return format(s, 'd MMM yyyy', { locale: th });
        return `${format(s, 'd')}–${format(e, 'd MMM yyyy', { locale: th })}`;
    } catch {
        return start;
    }
}

export function ExamResultsIndexClientPage({
    schedules, courses
}: {
    schedules: TrainingSchedule[];
    courses: Course[];
}) {
    const [search, setSearch] = useState('');

    const courseMap = new Map(courses.map(c => [c.id, c]));

    const filtered = schedules.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.courseTitle.toLowerCase().includes(q) || s.location.toLowerCase().includes(q);
    });

    // Group by courseId
    const grouped = filtered.reduce<Map<string, TrainingSchedule[]>>((acc, s) => {
        const arr = acc.get(s.courseId) ?? [];
        arr.push(s);
        acc.set(s.courseId, arr);
        return acc;
    }, new Map());

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-blue-600" /> ผลการทดสอบ
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">ดูผลการทดสอบรายรอบ แยกตามหลักสูตร</p>
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ค้นหาหลักสูตรหรือสถานที่..."
                    className="pl-9 rounded-xl"
                />
            </div>

            {filtered.length === 0 ? (
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                        <BookOpen className="w-10 h-10 opacity-30" />
                        <p>{search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีรอบการอบรมที่มีแบบทดสอบ'}</p>
                    </CardContent>
                </Card>
            ) : (
                Array.from(grouped.entries()).map(([courseId, courseSchedules]) => {
                    const course = courseMap.get(courseId);
                    return (
                        <Card key={courseId} className="rounded-2xl border-none shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    {course?.title ?? courseSchedules[0].courseTitle}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {courseSchedules.map(s => (
                                        <Link
                                            key={s.id}
                                            href={`/erp/exam-results/${s.id}`}
                                            className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">{formatDateRange(s.startDate, s.endDate)}</p>
                                                <p className="text-xs text-muted-foreground">{s.location}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={s.status === 'ยกเลิก' ? 'destructive' : 'outline'} className="text-xs">
                                                    {s.status}
                                                </Badge>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
}
