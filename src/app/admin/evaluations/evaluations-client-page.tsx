'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import type { EvaluationTemplate, Course, CourseCategory } from '@/lib/course-data';
import { createEvaluationTemplate, deleteEvaluationTemplate } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClipboardCheck, Plus, MoreHorizontal, Pencil, Trash2, Loader2, BookOpen } from 'lucide-react';

export function EvaluationsClientPage({
    templates,
    courses,
    categories = [],
}: {
    templates: EvaluationTemplate[];
    courses: Course[];
    categories?: CourseCategory[];
}) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [showCreate, setShowCreate] = useState(false);
    const [createCategoryFilter, setCreateCategoryFilter] = useState('all');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<EvaluationTemplate | null>(null);

    const assignedCourseIds = new Set(templates.map(t => t.courseId));
    const availableCourses = useMemo(
        () => courses.filter(c => !assignedCourseIds.has(c.id)),
        [courses, templates]
    );

    const parentIds = new Set(categories.filter(c => c.parentId).map(c => c.parentId!));
    const leafCategories = categories.filter(c => !parentIds.has(c.id));

    const filteredCourses = useMemo(() =>
        createCategoryFilter === 'all'
            ? availableCourses
            : availableCourses.filter(c => c.categoryId === createCategoryFilter),
        [availableCourses, createCategoryFilter]
    );

    function handleCreate() {
        const course = courses.find(c => c.id === selectedCourseId);
        if (!course) { toast({ title: 'กรุณาเลือกหลักสูตร', variant: 'destructive' }); return; }
        startTransition(async () => {
            const result = await createEvaluationTemplate(
                course.id,
                course.title,
                profile?.displayName || profile?.nickname || 'Staff',
            );
            if (result.success && result.id) {
                toast({ title: result.message });
                setShowCreate(false);
                window.location.href = `/admin/evaluations/${result.id}`;
            } else {
                toast({ title: result.message, variant: 'destructive' });
            }
        });
    }

    function handleDelete(t: EvaluationTemplate) {
        startTransition(async () => {
            const result = await deleteEvaluationTemplate(t.id);
            toast({ title: result.message, variant: result.success ? 'default' : 'destructive' });
            setDeleteTarget(null);
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                        <ClipboardCheck className="w-6 h-6 text-violet-600" /> จัดการแบบประเมิน
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">กำหนดแบบประเมินความพึงพอใจสำหรับแต่ละหลักสูตร</p>
                </div>
                <Button onClick={() => { setCreateCategoryFilter('all'); setSelectedCourseId(''); setShowCreate(true); }} className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4" /> สร้างแบบประเมิน
                </Button>
            </div>

            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">แบบประเมินทั้งหมด ({templates.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <BookOpen className="w-10 h-10 opacity-30" />
                            <p>ยังไม่มีแบบประเมิน กดปุ่ม "สร้างแบบประเมิน" เพื่อเริ่มต้น</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อแบบประเมิน</TableHead>
                                    <TableHead>หลักสูตร</TableHead>
                                    <TableHead>จำนวนส่วน</TableHead>
                                    <TableHead>จำนวนหัวข้อ</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium">{t.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{t.courseTitle}</TableCell>
                                        <TableCell className="text-sm">{t.sections.length} ส่วน</TableCell>
                                        <TableCell className="text-sm">
                                            {t.sections.reduce((s, sec) => s + sec.items.length, 0)} หัวข้อ
                                            {t.openQuestions.length > 0 && ` · ${t.openQuestions.length} คำถามปลายเปิด`}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/evaluations/${t.id}`} className="flex items-center gap-2">
                                                            <Pencil className="w-4 h-4" /> แก้ไขแบบประเมิน
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setDeleteTarget(t)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> ลบแบบประเมิน
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
                        <DialogTitle>สร้างแบบประเมินใหม่</DialogTitle>
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
                                    {filteredCourses.length === 0 ? (
                                        <SelectItem value="__none" disabled>ไม่มีหลักสูตรในหมวดนี้ที่ยังไม่มีแบบประเมิน</SelectItem>
                                    ) : (
                                        filteredCourses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">แบบประเมินจะถูกสร้างพร้อมหัวข้อเริ่มต้น สามารถแก้ไขได้ในภายหลัง</p>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">ยกเลิก</Button></DialogClose>
                        <Button onClick={handleCreate} disabled={isPending || !selectedCourseId} className="gap-2 bg-violet-600 hover:bg-violet-700">
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            สร้างและแก้ไข
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ลบแบบประเมิน?</AlertDialogTitle>
                        <AlertDialogDescription>
                            แบบประเมิน "{deleteTarget?.name}" จะถูกลบถาวร ผลการประเมินที่บันทึกไว้จะยังคงอยู่
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
