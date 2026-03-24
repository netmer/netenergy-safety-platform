'use client';

import { useState, useEffect, useActionState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Instructor } from '@/lib/course-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, UserCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createInstructor, updateInstructor, deleteInstructor, type InstructorFormState } from './actions';
import { useFormStatus } from 'react-dom';

const initialFormState: InstructorFormState = { success: false, message: '', errors: {} };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างข้อมูล')}
        </Button>
    );
}

export function InstructorsClientPage({ instructors }: { instructors: Instructor[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [instructorToEdit, setInstructorToEdit] = useState<Instructor | null>(null);
    const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null);

    const [createState, createAction] = useActionState(createInstructor, initialFormState);
    const boundUpdateAction = updateInstructor.bind(null, instructorToEdit?.id ?? '');
    const [updateState, updateAction] = useActionState(boundUpdateAction, initialFormState);

    const formState = instructorToEdit ? updateState : createState;
    const formAction = instructorToEdit ? updateAction : createAction;

    const handleCloseDialogs = useCallback(() => {
        setIsFormOpen(false);
        setIsDeleteAlertOpen(false);
    }, []);
    
    useEffect(() => {
        const state = instructorToEdit ? updateState : createState;
        if (state.message) {
            if (state.success) {
                toast({ title: "สำเร็จ!", description: state.message });
                handleCloseDialogs();
                router.refresh();
            } else {
                 toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: state.message });
            }
        }
    }, [createState, updateState, router, toast, handleCloseDialogs, instructorToEdit]);

    const handleOpenCreateForm = () => { setInstructorToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (instructor: Instructor) => { setInstructorToEdit(instructor); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (instructor: Instructor) => { setInstructorToDelete(instructor); setIsDeleteAlertOpen(true); };

    const handleDeleteConfirm = () => {
        if (!instructorToDelete) return;
        startTransition(async () => {
           try {
                const result = await deleteInstructor(instructorToDelete.id);
                if (result.success) {
                    toast({ title: 'สำเร็จ!', description: result.message });
                    router.refresh();
                } else {
                    toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' });
            } finally {
                handleCloseDialogs();
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>จัดการวิทยากร</CardTitle>
                        <CardDescription>เพิ่ม, แก้ไข, และลบรายชื่อวิทยากรสำหรับใช้ในใบประกาศนียบัตร</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มวิทยากรใหม่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อ-นามสกุล</TableHead>
                            <TableHead>ตำแหน่ง</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {instructors.length > 0 ? instructors.map((instructor) => (
                            <TableRow key={instructor.id}>
                                <TableCell className="font-medium">{instructor.name}</TableCell>
                                <TableCell>{instructor.title}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleOpenEditForm(instructor)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(instructor)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">ยังไม่มีข้อมูลวิทยากร</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsFormOpen(true);}}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{instructorToEdit ? 'แก้ไขข้อมูลวิทยากร' : 'เพิ่มวิทยากรใหม่'}</DialogTitle>
                        <DialogDescription className="sr-only">
                          แบบฟอร์มกรอกข้อมูลชื่อและตำแหน่งของวิทยากรผู้สอน
                        </DialogDescription>
                    </DialogHeader>
                    <form 
                        key={instructorToEdit?.id ?? 'create'} 
                        action={formAction} 
                        className="grid gap-6 py-4"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                            <Input id="name" name="name" defaultValue={instructorToEdit?.name ?? ''} required/>
                            {formState?.errors?.name && <p className="text-sm font-medium text-destructive">{formState.errors.name[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="title">ตำแหน่ง *</Label>
                            <Input id="title" name="title" defaultValue={instructorToEdit?.title ?? ''} placeholder="เช่น วิทยากรผู้สอน, กรรมการผู้จัดการ" required/>
                            {formState?.errors?.title && <p className="text-sm font-medium text-destructive">{formState.errors.title[0]}</p>}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                            <SubmitButton isEditing={!!instructorToEdit} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsDeleteAlertOpen(true);}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ การลบข้อมูลวิทยากร "{instructorToDelete?.name}" จะเป็นการลบข้อมูลออกจากระบบอย่างถาวร
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                           {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           ใช่, ลบเลย
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}