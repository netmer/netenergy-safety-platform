// @ts-nocheck
'use client';

import { useState, useEffect, useActionState, useTransition, useMemo } from 'react';
import type { CourseCategory } from '@/lib/course-data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
    submitCategory, deleteCategory, updateCategoryOrder,
    type FormState as CategoryFormState,
} from './actions';
import { useFormStatus } from 'react-dom';

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกหมวดหมู่' : 'สร้างหมวดหมู่')}
        </Button>
    );
}

const initialCategoryState: CategoryFormState = { message: '', errors: {}, success: false };

function InlineOrderEditor({ id, initialOrderIndex, onUpdateOrder }: { id: string; initialOrderIndex: number, onUpdateOrder: (id: string, order: number) => Promise<{success: boolean, message?: string}> }) {
  const [orderIndex, setOrderIndex] = useState(initialOrderIndex);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleBlur = () => {
    if (orderIndex === initialOrderIndex) return;

    startTransition(async () => {
      const result = await onUpdateOrder(id, orderIndex);
      if (result.success) {
        toast({ title: 'สำเร็จ', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
        setOrderIndex(initialOrderIndex);
      }
    });
  };

  return (
    <div className="flex items-center gap-2 justify-center">
      <Input
        type="number"
        value={orderIndex}
        onChange={(e) => setOrderIndex(Number(e.target.value))}
        onBlur={handleBlur}
        disabled={isPending}
        className="h-8 w-20 text-center bg-background"
      />
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function CategoriesTab({ categories = [] }: { categories: CourseCategory[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<CourseCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<CourseCategory | null>(null);
    
    const sortedCategories = useMemo(() => {
        if (!categories) return [];
        return [...categories].sort((a,b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999))
    }, [categories]);

    // Available parents (categories that are not sub-categories themselves, and not the current one)
    const availableParents = useMemo(() => {
        return categories.filter(c => !c.parentId && c.id !== categoryToEdit?.id);
    }, [categories, categoryToEdit]);

    const [formState, formAction] = useActionState(submitCategory, initialCategoryState);

    useEffect(() => {
        if (!formState.message) return;
        
        if (formState.success) {
            toast({ title: "สำเร็จ!", description: formState.message });
            handleCloseDialogs();
        } else {
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: formState.message });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formState]);

    const handleOpenCreateForm = () => { setCategoryToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (category: CourseCategory) => { setCategoryToEdit(category); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (category: CourseCategory) => { setCategoryToDelete(category); setIsDeleteAlertOpen(true); };
    const handleCloseDialogs = () => { 
        setIsFormOpen(false); 
        setIsDeleteAlertOpen(false); 
        setCategoryToEdit(null);
        setCategoryToDelete(null);
    };

    const handleDeleteConfirm = () => {
        if (!categoryToDelete) return;
        startTransition(async () => {
            const result = await deleteCategory(categoryToDelete.id);
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            handleCloseDialogs();
        });
    };

    const getParentTitle = (parentId?: string | null) => {
        if (!parentId) return null;
        return categories.find(c => c.id === parentId)?.title;
    }

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>หมวดหมู่หลักสูตร</CardTitle>
                        <CardDescription>จัดการหมวดหมู่หลักและหมวดหมู่ย่อยสำหรับแยกหลักสูตร</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm} className="rounded-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มหมวดหมู่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px] text-center">ลำดับ</TableHead>
                            <TableHead>ชื่อหมวดหมู่</TableHead>
                            <TableHead>ระดับ</TableHead>
                            <TableHead>คำอธิบาย</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedCategories.map((category) => {
                            const parentTitle = getParentTitle(category.parentId);
                            return (
                                <TableRow key={category.id}>
                                    <TableCell>
                                        <InlineOrderEditor id={category.id} initialOrderIndex={category.orderIndex ?? 0} onUpdateOrder={updateCategoryOrder} />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {category.parentId && <span className="text-muted-foreground mr-2">└</span>}
                                        {category.title}
                                    </TableCell>
                                    <TableCell>
                                        {parentTitle ? (
                                            <Badge variant="outline" className="gap-1 font-normal bg-blue-50 border-blue-100 text-blue-700">
                                                <GitBranch className="w-3 h-3" /> ย่อยของ {parentTitle}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="font-normal">หมวดหมู่หลัก</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{category.description}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEditForm(category)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(category)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {sortedCategories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ยังไม่มีข้อมูลหมวดหมู่</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                    <DialogContent className="sm:max-w-2xl rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>{categoryToEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
                          <DialogDescription>
                            จัดการข้อมูลและระดับความสัมพันธ์ของหมวดหมู่หลักสูตร
                          </DialogDescription>
                        </DialogHeader>
                        <form action={formAction} className="grid gap-4 py-4">
                            <input type="hidden" name="id" value={categoryToEdit?.id || ''} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">ชื่อหมวดหมู่</Label>
                                    <Input id="title" name="title" defaultValue={categoryToEdit?.title ?? ''} required placeholder="เช่น งานความปลอดภัยทั่วไป" />
                                    {formState?.errors?.title && <p className="text-xs text-destructive">{formState.errors.title[0]}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="parentId">หมวดหมู่พ่อ (ถ้าเป็นหมวดหมู่ย่อย)</Label>
                                    <Select name="parentId" defaultValue={categoryToEdit?.parentId || 'none'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="ระบุหมวดหมู่หลัก..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- เป็นหมวดหมู่หลัก --</SelectItem>
                                            {availableParents.map(parent => (
                                                <SelectItem key={parent.id} value={parent.id}>{parent.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">คำอธิบาย</Label>
                                <Textarea id="description" name="description" defaultValue={categoryToEdit?.description ?? ''} placeholder="สรุปสั้นๆ เกี่ยวกับหลักสูตรในหมวดนี้..." />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="image">รูปภาพหน้าปก</Label>
                                    <Input id="image" name="image" type="file" accept="image/*" />
                                    {categoryToEdit?.image && (
                                        <div className="mt-2 relative aspect-video w-32 rounded-lg overflow-hidden border">
                                            <Image src={categoryToEdit.image} alt={categoryToEdit.title} fill className="object-cover"/>
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hint">คำใบ้รูปภาพ (สำหรับ AI Search)</Label>
                                    <Input id="hint" name="hint" defaultValue={categoryToEdit?.hint ?? ''} placeholder='เช่น safety training' />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                                <SubmitButton isEditing={!!categoryToEdit} />
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                    <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader><AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle><AlertDialogDescription>ต้องการลบหมวดหมู่ "{categoryToDelete?.title}" ใช่หรือไม่? <br/><span className="text-destructive font-bold">คำเตือน:</span> หากลบหมวดหมู่หลัก หมวดหมู่ย่อยจะกลายเป็นหมวดหมู่หลักโดยอัตโนมัติ</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90 rounded-full">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ใช่, ลบเลย'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
