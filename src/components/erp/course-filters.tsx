'use client';

import React, { useMemo } from 'react';
import { Search, X, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Course, CourseCategory, TrainingSchedule } from '@/lib/course-data';

interface CourseFiltersProps {
    courses: Course[];
    categories: CourseCategory[];
    schedules?: TrainingSchedule[];
    
    searchQuery: string;
    categoryFilter: string;
    courseFilter: string;
    scheduleFilter?: string;
    dateRange?: DateRange;

    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onCourseChange: (value: string) => void;
    onScheduleChange?: (value: string) => void;
    onDateRangeChange?: (range: DateRange | undefined) => void;
    
    className?: string;
}

export function CourseFilters({
    courses,
    categories,
    schedules,
    searchQuery,
    categoryFilter,
    courseFilter,
    scheduleFilter,
    dateRange,
    onSearchChange,
    onCategoryChange,
    onCourseChange,
    onScheduleChange,
    onDateRangeChange,
    className
}: CourseFiltersProps) {
    
    // 1. Identify leaf categories (categories that are NOT parents of any other category)
    const leafCategories = useMemo(() => {
        const parentIds = new Set(categories.map(c => c.parentId).filter(Boolean));
        return categories
            .filter(c => !parentIds.has(c.id))
            .sort((a, b) => (a.orderIndex ?? 99) - (b.orderIndex ?? 99));
    }, [categories]);

    // 2. Filtered and Sorted Course list
    const filteredCoursesList = useMemo(() => {
        return courses
            .filter(c => categoryFilter === 'all' || c.categoryId === categoryFilter)
            .sort((a, b) => (a.orderIndex ?? 99) - (b.orderIndex ?? 99));
    }, [courses, categoryFilter]);

    // 3. Filtered and Sorted Schedule list (Date DESC)
    const filteredSchedulesList = useMemo(() => {
        if (!schedules) return [];
        return schedules
            .filter(s => courseFilter === 'all' || s.courseId === courseFilter)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [schedules, courseFilter]);

    const formatDateRangeLabel = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (startDate.getTime() === endDate.getTime()) return format(startDate, 'd MMM yy', { locale: th });
        return `${format(startDate, 'd')}-${format(endDate, 'd MMM yy', { locale: th })}`;
    };

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4", className)}>
            <div className="lg:col-span-4 space-y-1.5 text-left">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-2">ค้นหาข้อมูล</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="ค้นหาชื่อ, บริษัท, หรือหลักสูตร..." 
                        value={searchQuery} 
                        onChange={e => onSearchChange(e.target.value)} 
                        className="pl-10 h-11 rounded-xl bg-background border-none shadow-sm"
                    />
                </div>
            </div>

            <div className="lg:col-span-2 space-y-1.5 text-left">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-2">หมวดหมู่</Label>
                <Select value={categoryFilter} onValueChange={onCategoryChange}>
                    <SelectTrigger className="h-11 rounded-xl bg-background border-none shadow-sm font-semibold">
                        <SelectValue placeholder="ทุกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent className="z-[130] rounded-xl border-none shadow-2xl">
                        <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                        {leafCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className={cn(onScheduleChange || onDateRangeChange ? "lg:col-span-3" : "lg:col-span-6", "space-y-1.5 text-left")}>
                <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-2">หลักสูตร</Label>
                <Select value={courseFilter} onValueChange={onCourseChange}>
                    <SelectTrigger className="h-11 rounded-xl bg-background border-none shadow-sm font-semibold">
                        <SelectValue placeholder="เลือกหลักสูตร..." />
                    </SelectTrigger>
                    <SelectContent className="z-[130] rounded-xl border-none shadow-2xl max-w-[400px]">
                        <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                        {filteredCoursesList.map(c => <SelectItem key={c.id} value={c.id} className="truncate font-semibold">{c.shortName || c.title}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {onScheduleChange && (
                <div className="lg:col-span-3 space-y-1.5 text-left">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-2">รอบอบรม</Label>
                    <Select value={scheduleFilter} onValueChange={onScheduleChange}>
                        <SelectTrigger className="h-11 rounded-xl bg-background border-none shadow-sm font-semibold">
                            <SelectValue placeholder="ทุกรอบ" />
                        </SelectTrigger>
                        <SelectContent className="z-[130] rounded-xl border-none shadow-2xl">
                            <SelectItem value="all">ทุกรอบ</SelectItem>
                            {filteredSchedulesList.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    <span className="flex items-center gap-1.5">
                                        {formatDateRangeLabel(s.startDate, s.endDate)} - {s.location}
                                        {s.scheduleType === 'inhouse' && (
                                            <span className="text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded leading-none shrink-0">IH</span>
                                        )}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {onDateRangeChange && (
                <div className="lg:col-span-3 space-y-1.5 text-left">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-2">ช่วงวันที่สมัคร</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-11 rounded-xl bg-background border-none shadow-sm font-semibold w-full justify-start gap-3 px-4", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                                {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, 'd MMM yy')} - {format(dateRange.to, 'd MMM yy')}</> : format(dateRange.from, 'd MMM yy')) : 'เลือกช่วงวันที่...'}
                                {dateRange && <X className="h-4 w-4 ml-auto opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDateRangeChange(undefined); }} />}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl z-[150]" align="end">
                            <CalendarComponent mode="range" selected={dateRange} onSelect={onDateRangeChange} numberOfMonths={2} locale={th} />
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </div>
    );
}