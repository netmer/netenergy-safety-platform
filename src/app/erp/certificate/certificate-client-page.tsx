'use client';

import React, { useState, useMemo } from 'react';
import type { TrainingRecord, TrainingSchedule, Course, CourseCategory, CertificateTemplate as TemplateType } from '@/lib/course-data';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Award, History, FileSignature, Printer, X, Filter, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CertificateTemplate } from './certificate-template';
import { CertificateSearchForm } from './certificate-search-form';
import { Separator } from '@/components/ui/separator';
import { CourseFilters } from '@/components/erp/course-filters';

interface CertificateClientPageProps {
  records: TrainingRecord[];
  schedules: TrainingSchedule[];
  courses: Course[];
  categories: CourseCategory[];
  templates: TemplateType[];
}

export function CertificateClientPage({ records, schedules, courses, categories, templates }: CertificateClientPageProps) {
    const [recordToView, setRecordToView] = useState<TrainingRecord | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [scheduleFilter, setScheduleFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
    const schedulesMap = useMemo(() => new Map(schedules.map(s => [s.id, s])), [schedules]);
    const templatesMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);
    
    const displayedRecords = useMemo(() => {
        if (scheduleFilter === 'all') return [];
        return records.filter(r => r.scheduleId === scheduleFilter && (!searchQuery || r.attendeeName.toLowerCase().includes(searchQuery.toLowerCase())));
    }, [scheduleFilter, searchQuery, records]);

    const recordCourse = recordToView ? coursesMap.get(recordToView.courseId) : undefined;
    const recordSchedule = recordToView ? schedulesMap.get(recordToView.scheduleId) : undefined;
    const courseTemplate = recordCourse?.certificateTemplateId ? templatesMap.get(recordCourse.certificateTemplateId) : undefined;

    return (
      <div className="space-y-10">
        <CertificateSearchForm />
        <Separator className="opacity-50" />
        
        <div className="space-y-6 text-left">
            <h3 className="text-2xl font-bold font-headline flex items-center gap-3 px-4 md:px-0">
                <History className="text-primary"/> ค้นหาใบประกาศรายรอบ
            </h3>

            <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950">
                <CardHeader className="bg-muted/30 border-b pb-8">
                    <CourseFilters 
                        courses={courses}
                        categories={categories}
                        schedules={schedules}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        categoryFilter={categoryFilter}
                        onCategoryChange={(v) => {setCategoryFilter(v); setCourseFilter('all'); setScheduleFilter('all');}}
                        courseFilter={courseFilter}
                        onCourseChange={(v) => {setCourseFilter(v); setScheduleFilter('all');}}
                        scheduleFilter={scheduleFilter}
                        onScheduleChange={setScheduleFilter}
                    />
                </CardHeader>

                {scheduleFilter !== 'all' ? (
                    <CardContent className="p-0">
                        <div className="p-8 border-b">
                            <h4 className="text-xl font-bold font-headline">{schedulesMap.get(scheduleFilter)?.courseTitle}</h4>
                            <div className="flex gap-2 mt-3">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold"><Users className="w-3.5 h-3.5 mr-1.5"/>{displayedRecords.length} คน</Badge>
                            </div>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="py-5 pl-8 uppercase tracking-widest text-[10px] font-bold text-slate-400">ชื่อผู้เข้าอบรม</TableHead>
                                    <TableHead className="uppercase tracking-widest text-[10px] font-bold text-slate-400">เลขที่ใบประกาศ</TableHead>
                                    <TableHead className="text-right pr-8 uppercase tracking-widest text-[10px] font-bold text-slate-400">ดำเนินการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedRecords.map((r) => (
                                    <TableRow key={r.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell className="py-6 pl-8 text-left font-bold">{r.attendeeName}<div className="text-[10px] text-muted-foreground font-medium uppercase mt-1">{r.companyName}</div></TableCell>
                                        <TableCell className="text-left font-mono text-xs">{r.certificateId || '-'}</TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 gap-2 border-slate-200" disabled={!r.certificateId} onClick={() => setRecordToView(r)}>
                                                <FileSignature className="w-4 h-4"/> พิมพ์
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                ) : (
                    <CardContent className="py-20 text-center text-slate-400 font-light">เลือกรอบอบรมเพื่อแสดงรายชื่อ</CardContent>
                )}
            </Card>
        </div>

        {recordToView && recordCourse && recordSchedule && (
            <Dialog open={!!recordToView} onOpenChange={(v) => !v && setRecordToView(null)}>
                <DialogContent className="max-w-5xl rounded-[2rem] p-0 overflow-hidden shadow-2xl border-none">
                    <DialogHeader className="p-8 pb-4 text-left border-b bg-white dark:bg-slate-950">
                        <DialogTitle className="text-xl font-bold font-headline">พรีวิวใบประกาศนียบัตร</DialogTitle>
                        <DialogDescription>{recordToView.attendeeName} - {recordCourse.title}</DialogDescription>
                    </DialogHeader>
                    <div className="p-10 bg-slate-100/50 flex justify-center">
                        <div className="max-w-4xl w-full">
                            <CertificateTemplate record={recordToView} course={recordCourse} schedule={recordSchedule} template={courseTemplate} />
                        </div>
                    </div>
                    <DialogFooter className="p-6 border-t bg-white dark:bg-slate-950">
                        <Button variant="ghost" onClick={() => setRecordToView(null)} className="rounded-xl font-bold h-12 px-6">ปิด</Button>
                        <Button onClick={() => window.print()} className="rounded-xl font-bold h-12 px-8 shadow-lg shadow-primary/20"><Printer className="w-4 h-4 mr-2"/> พิมพ์ / PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
      </div>
    );
}