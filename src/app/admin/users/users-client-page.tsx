'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import type { AppUser } from '@/lib/course-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createUser, updateUser, deleteUser, type UserFormState } from './actions';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';

const initialFormState: UserFormState = { message: '', errors: {} };

const roleConfig: Record<AppUser['role'], { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-destructive text-destructive-foreground' },
    course_specialist: { label: 'Course Specialist', className: 'bg-blue-600 text-white' },
    training_team: { label: 'Training Team', className: 'bg-amber-600 text-white' },
    inspection_team: { label: 'Inspection Team', className: 'bg-green-600 text-white' },
    accounting_team: { label: 'Accounting', className: 'bg-purple-600 text-white' },
};

function RoleBadge({ role }: { role: AppUser['role'] }) {
    const config = roleConfig[role] || { label: role, className: 'bg-muted-foreground text-muted' };
    return <Badge className={cn('font-semibold', config.className)}>{config.label}</Badge>;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? (isEditing ? 'กำลังบันทึก...' : 'กำลังสร้าง...') : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างผู้ใช้')}
        </Button>
    );
}

export function UsersClientPage({ users }: { users: AppUser[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<AppUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

    const [createState, createAction] = useActionState(createUser, initialFormState);
    const boundUpdateAction = updateUser.bind(null, userToEdit?.uid ?? '');
    const [updateState, updateAction] = useActionState(boundUpdateAction, initialFormState);

    const formState = userToEdit ? updateState : createState;
    const formAction = userToEdit ? updateAction : createAction;

    useEffect(() => {
        if (!formState.message) return;
        if (formState.errors || formState.message.includes('Error')) {
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: formState.message });
        } else {
            toast({ title: "สำเร็จ!", description: formState.message });
            handleCloseDialogs();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formState]);

    const handleOpenCreateForm = () => { setUserToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (user: AppUser) => { setUserToEdit(user); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (user: AppUser) => { setUserToDelete(user); setIsDeleteAlertOpen(true); };
    const handleCloseDialogs = () => { setIsFormOpen(false); setIsDeleteAlertOpen(false); };

    const handleDeleteConfirm = () => {
        if (!userToDelete) return;
        startTransition(async () => {
            const result = await deleteUser(userToDelete.uid);
            if (result.message?.includes('Error')) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            } else {
                toast({ title: 'สำเร็จ!', description: result.message });
            }
            handleCloseDialogs();
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>จัดการบัญชีผู้ใช้</CardTitle>
                        <CardDescription>เพิ่ม, แก้ไข, และลบบัญชีผู้ใช้ในระบบ</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มผู้ใช้ใหม่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อที่แสดง</TableHead>
                            <TableHead>อีเมล</TableHead>
                            <TableHead>บทบาท</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.displayName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell><RoleBadge role={user.role} /></TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleOpenEditForm(user)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(user)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsFormOpen(true);}}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{userToEdit ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
                        <DialogDescription className="sr-only">
                          จัดการบัญชีผู้ใช้งานระบบและกำหนดบทบาทการทำงาน
                        </DialogDescription>
                    </DialogHeader>
                    <form key={userToEdit?.uid ?? 'create'} action={formAction} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input id="email" name="email" type="email" defaultValue={userToEdit?.email ?? ''} required disabled={!!userToEdit} />
                             {userToEdit && <p className="text-xs text-muted-foreground">ไม่สามารถแก้ไขอีเมลได้</p>}
                            {formState?.errors?.email && <p className="text-sm font-medium text-destructive">{formState.errors.email[0]}</p>}
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="displayName">ชื่อที่แสดง</Label>
                            <Input id="displayName" name="displayName" defaultValue={userToEdit?.displayName ?? ''} required />
                            {formState?.errors?.displayName && <p className="text-sm font-medium text-destructive">{formState.errors.displayName[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">บทบาท</Label>
                            <Select name="role" defaultValue={userToEdit?.role ?? 'course_specialist'} required>
                                <SelectTrigger><SelectValue placeholder="เลือกบทบาท" /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(roleConfig).map(([key, {label}]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formState?.errors?.role && <p className="text-sm font-medium text-destructive">{formState.errors.role[0]}</p>}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                            <SubmitButton isEditing={!!userToEdit} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsDeleteAlertOpen(true);}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ การลบบัญชีผู้ใช้ "{userToDelete?.displayName}" จะเป็นการลบข้อมูลออกจากระบบอย่างถาวร
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