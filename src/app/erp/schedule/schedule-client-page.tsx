'use client';

import { useState, useMemo } from 'react';
import type { TrainingSchedule, Course, CourseCategory, Instructor } from '@/lib/course-data';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    PlusCircle, Pencil, Trash2, Loader2, Calendar as CalendarIcon, 
    CheckCircle, Clock, XCircle, MapPin, UserCircle, Filter
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { CourseFilters } from '@/components/erp/course-filters';

const statusConfig: Record<TrainingSchedule['status'], { label: string; className: string, icon: React.ElementType }> = {
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
        <Badge variant="outline" className={cn('gap-x-1.5 whitespace-nowrap font-bold px-2 py-0.5 rounded-lg', config.className)}>
            <config.icon className="h-3.5 w-3.5" />
            {config.label}
        </Badge>
    );
}

export function ScheduleClientPage({ schedules: initialSchedules, courses, categories }: { schedules: TrainingSchedule[], courses: Course[], categories: CourseCategory[], instructors: Instructor[]}) {
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
    
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'trainingSchedules'), orderBy('startDate', 'desc'));
    }, [firestore]);
    
    const { data, isLoading } = useCollection<TrainingSchedule>(schedulesQuery);
    const liveSchedules = data || initialSchedules || [];
    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

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
        liveSchedules.forEach(s => { try { days.push(...eachDayOfInterval({start: parseISO(s.startDate), end: parseISO(s.endDate)})); } catch {} });
        return days;
    }, [liveSchedules]);

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">จัดการตารางอบรม</h1>
                    <p className="text-muted-foreground mt-1 font-light">บริหารจัดการรอบการอบรมและรายชื่อวิทยากร</p>
                </div>
                <Button size="lg" className="rounded-2xl h-14 px-8 shadow-xl font-bold"><PlusCircle className="mr-2 h-5 w-5" /> เพิ่มรอบใหม่</Button>
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
                                            <TableHead className="font-bold text-center">สถานะ</TableHead>
                                            <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSchedules.map((s) => (
                                            <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                                                <TableCell className="py-6 text-left font-bold">{coursesMap.get(s.courseId)?.shortName || s.courseTitle}<div className="text-[10px] text-muted-foreground font-medium uppercase mt-1 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" />{formatDateRange(s.startDate, s.endDate)}</div></TableCell>
                                                <TableCell className="text-left font-medium text-sm text-slate-600 dark:text-slate-400"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary"/>{s.location}</div><div className="flex items-center gap-1.5 mt-1 opacity-70"><UserCircle className="w-3.5 h-3.5"/>{s.instructorName || '-'}</div></TableCell>
                                                <TableCell className="text-center"><StatusBadge status={s.status} /></TableCell>
                                                <TableCell className="text-right pr-6"><Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Pencil className="h-4 w-4"/></Button></TableCell>
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
                            <Calendar mode="range" selected={dateFilter} onSelect={setDateFilter} modifiers={{ scheduled: scheduledDays }} modifiersStyles={{ scheduled: { fontWeight: '700', color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary)/0.1)', borderRadius: '8px' } }} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}