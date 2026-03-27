'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import type { ExamTemplate, Course, CourseCategory } from '@/lib/course-data';
import { getExamModeLabel } from '@/lib/exam-utils';
import { createExamTemplate, deleteExamTemplate, duplicateExamTemplate } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileQuestion, Plus, MoreHorizontal, Pencil, Trash2, Loader2, BookOpen, Copy } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const examModeOptions: { value: ExamTemplate['examMode']; label: string }[] = [
    { value: 'both', label: 'ก่อนเรียนและหลังเรียน' },
    { value: 'posttest_only', label: 'หลังเรียนเท่านั้น' },
    { value: 'pretest_only', label: 'ก่อนเรียนเท่านั้น' },
    { value: 'none', label: 'ไม่มีการทดสอบ' },
];

export function ExamsClientPage({
    templates,
    courses,
    categories = [],
    basePath = '/erp/exams',
}: {
    templates: ExamTemplate[];
    courses: Course[];
    categories?: CourseCategory[];
    basePath?: string;
}) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // Create dialog state
    const [showCreate, setShowCreate] = useState(false);
    const [createCategoryFilter, setCreateCategoryFilter] = useState('all');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedMode, setSelectedMode] = useState<ExamTemplate['examMode']>('both');

    // Duplicate dialog state
    const [duplicateSource, setDuplicateSource] = useState<ExamTemplate | null>(null);
    const [dupCategoryFilter, setDupCategoryFilter] = useState('all');
    const [dupTargetCourseId, setDupTargetCourseId] = useState('');

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<ExamTemplate | null>(null);

    // Courses without templates
    const assignedCourseIds = new Set(templates.map(t => t.courseId));
    const availableCourses = useMemo(
        () => courses.filter(c => !assignedCourseIds.has(c.id)),
        [courses, assignedCourseIds]
    );

    // Leaf categories (used as actual course categories)
    const parentIds = new Set(categories.filter(c => c.parentId).map(c => c.parentId!));
    const leafCategories = categories.filter(c => !parentIds.has(c.id));

    const filteredCreateCourses = useMemo(() =>
        createCategoryFilter === 'all'
            ? availableCourses
            : availableCourses.filter(c => c.categoryId === createCategoryFilter),
        [availableCourses, createCategoryFilter]
    );

    const filteredDupCourses = useMemo(() =>
        dupCategoryFilter === 'all'
            ? availableCourses
            : availableCourses.filter(c => c.categoryId === dupCategoryFilter),
        [availableCourses, dupCategoryFilter]
    );

    function handleCreate() {
        if (!selectedCourseId) {
            toast({ title: 'กรุณาเลือกหลักสูตร', variant: 'destructive' });
            return;
        }
        const course = courses.find(c => c.id === selectedCourseId)!;
        startTransition(async () => {
            const result = await createExamTemplate({
                name: `แบบทดสอบ ${course.title}`,
                courseId: course.id,
                courseTitle: course.title,
                examMode: selectedMode,
                createdBy: profile?.displayName || profile?.nickname || 'Staff',
            });
            if (result.success && result.id) {
                toast({ title: result.message });
                setShowCreate(false);
                window.location.href = `${basePath}/${result.id}`;
            } else {
                toast({ title: result.message, variant: 'destructive' });
            }
        });
    }

    function handleDuplicate() {
        if (!duplicateSource || !dupTargetCourseId) {
            toast({ title: 'กรุณาเลือกหลักสูตรปลายทาง', variant: 'destructive' });
            return;
        }
        startTransition(async () => {
            const result = await duplicateExamTemplate(
                duplicateSource.id,
                dupTargetCourseId,
                profile?.displayName || profile?.nickname || 'Staff'
            );
            if (result.success && result.id) {
                toast({ title: result.message });
                setDuplicateSource(null);
                setDupTargetCourseId('');
                window.location.href = `${basePath}/${result.id}`;
            } else {
                toast({ title: result.message, variant: 'destructive' });
            }
        });
    }

    function handleDelete(template: ExamTemplate) {
        startTransition(async () => {
            const result = await deleteExamTemplate(template.id);
            toast({ title: result.message, variant: result.success ? 'default' : 'destructive' });
            setDeleteTarget(null);
        });
    }

    const getQuestionCount = (t: ExamTemplate) => {
        const pre = t.pretest?.questions?.length ?? 0;
        const post = t.posttest?.questions?.length ?? 0;
        if (t.examMode === 'both') return `${pre} / ${post} ข้อ`;
        if (t.examMode === 'pretest_only') return `${pre} ข้อ`;
        if (t.examMode === 'posttest_only') return `${post} ข้อ`;
        return '–';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                        <FileQuestion className="w-6 h-6 text-blue-600" /> จัดการแบบทดสอบ
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">กำหนดแบบทดสอบก่อน/หลังเรียนสำหรับแต่ละหลักสูตร</p>
                </div>
                <Button onClick={() => { setCreateCategoryFilter('all'); setSelectedCourseId(''); setShowCreate(true); }} className="rounded-xl gap-2">
                    <Plus className="w-4 h-4" /> สร้างแบบทดสอบ
                </Button>
            </div>

            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">แบบทดสอบทั้งหมด ({templates.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <BookOpen className="w-10 h-10 opacity-30" />
                            <p>ยังไม่มีแบบทดสอบ กดปุ่ม "สร้างแบบทดสอบ" เพื่อเริ่มต้น</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อแบบทดสอบ</TableHead>
                                    <TableHead>หลักสูตร</TableHead>
                                    <TableHead>รูปแบบ</TableHead>
                                    <TableHead>จำนวนข้อ (ก่อน/หลัง)</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium">{t.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{t.courseTitle}</TableCell>
                                        <TableCell>
                                            <Badge variant={t.examMode === 'none' ? 'secondary' : 'outline'} className="text-xs">
                                                {getExamModeLabel(t.examMode)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{getQuestionCount(t)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`${basePath}/${t.id}`} className="flex items-center gap-2">
                                                            <Pencil className="w-4 h-4" /> แก้ไขข้อสอบ
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => { setDuplicateSource(t); setDupCategoryFilter('all'); setDupTargetCourseId(''); }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Copy className="w-4 h-4" /> ทำสำเนาไปยังหลักสูตรอื่น
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setDeleteTarget(t)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> ลบแบบทดสอบ
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle>สร้างแบบทดสอบใหม่</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {leafCategories.length > 0 && (
                            <div className="space-y-2">
                                <Label>กรองตามหมวดหมู่</Label>
                                <Select value={createCategoryFilter} onValueChange={v => { setCreateCategoryFilter(v); setSelectedCourseId(''); }}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="ทุกหมวดหมู่" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                                        {leafCategories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>เลือกหลักสูตร</Label>
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="เลือกหลักสูตร..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredCreateCourses.length === 0 ? (
                                        <SelectItem value="__none" disabled>ไม่มีหลักสูตรในหมวดนี้ที่ยังไม่มีแบบทดสอบ</SelectItem>
                                    ) : (
                                        filteredCreateCourses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>รูปแบบการทดสอบ</Label>
                            <Select value={selectedMode} onValueChange={v => setSelectedMode(v as ExamTemplate['examMode'])}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {examModeOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">ยกเลิก</Button></DialogClose>
                        <Button onClick={handleCreate} disabled={isPending || !selectedCourseId} className="gap-2">
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            สร้างและแก้ไขข้อสอบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Dialog */}
            <Dialog open={!!duplicateSource} onOpenChange={open => !open && setDuplicateSource(null)}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Copy className="w-4 h-4" /> ทำสำเนาแบบทดสอบ
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        สำเนาจาก: <span className="font-medium text-foreground">{duplicateSource?.name}</span>
                    </p>
                    <div className="space-y-4 py-1">
                        {leafCategories.length > 0 && (
                            <div className="space-y-2">
                                <Label>กรองตามหมวดหมู่</Label>
                                <Select value={dupCategoryFilter} onValueChange={v => { setDupCategoryFilter(v); setDupTargetCourseId(''); }}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="ทุกหมวดหมู่" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                                        {leafCategories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>หลักสูตรปลายทาง</Label>
                            <Select value={dupTargetCourseId} onValueChange={setDupTargetCourseId}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="เลือกหลักสูตรที่จะนำไปใช้..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredDupCourses.length === 0 ? (
                                        <SelectItem value="__none" disabled>ไม่มีหลักสูตรที่ยังไม่มีแบบทดสอบ</SelectItem>
                                    ) : (
                                        filteredDupCourses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">ยกเลิก</Button></DialogClose>
                        <Button onClick={handleDuplicate} disabled={isPending || !dupTargetCourseId} className="gap-2">
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            ทำสำเนาและแก้ไข
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ลบแบบทดสอบ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            แบบทดสอบ "{deleteTarget?.name}" จะถูกลบถาวร ผลการทดสอบที่บันทึกไว้จะยังคงอยู่
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => deleteTarget && handleDelete(deleteTarget)}
                            disabled={isPending}
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            ลบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
