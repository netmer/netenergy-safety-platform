'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import type { Client } from '@/lib/course-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, Building, User, Mail, Phone, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createClient, updateClient, deleteClient, type ClientFormState } from './actions';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';

const initialFormState: ClientFormState = { message: '', errors: {}, success: undefined };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="rounded-full">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างลูกค้า')}
        </Button>
    );
}

export function ClientsClientPage({ clients }: { clients: Client[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const [createState, createAction] = useActionState(createClient, initialFormState);
    const boundUpdateAction = updateClient.bind(null, clientToEdit?.id ?? '');
    const [updateState, updateAction] = useActionState(boundUpdateAction, initialFormState);

    const formState = clientToEdit ? updateState : createState;
    const formAction = clientToEdit ? updateAction : createAction;

    useEffect(() => {
        if (formState.success === undefined) return;
        if (formState.success) {
            toast({ title: "สำเร็จ!", description: formState.message });
            handleCloseDialogs();
        } else if (formState.message) {
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: formState.message });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formState]);

    const handleOpenCreateForm = () => { setClientToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (client: Client) => { setClientToEdit(client); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (client: Client) => { setClientToDelete(client); setIsDeleteAlertOpen(true); };
    const handleCloseDialogs = () => { setIsFormOpen(false); setIsDeleteAlertOpen(false); };

    const handleDeleteConfirm = () => {
        if (!clientToDelete) return;
        startTransition(async () => {
            const result = await deleteClient(clientToDelete.id);
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            handleCloseDialogs();
        });
    };

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>จัดการลูกค้าองค์กร</CardTitle>
                        <CardDescription>เพิ่มและจัดการรายชื่อลูกค้า พร้อมอัปโหลดโลโก้เพื่อแสดงผลที่หน้าแรก</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm} className="rounded-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มลูกค้าใหม่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">โลโก้</TableHead>
                            <TableHead>ชื่อบริษัท</TableHead>
                            <TableHead>ผู้ติดต่อ</TableHead>
                            <TableHead className="text-center">แสดงหน้าแรก</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.length > 0 ? clients.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell>
                                    <div className="relative w-12 h-12 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                                        {client.logo ? (
                                            <Image src={client.logo} alt={client.companyName} fill className="object-contain p-1" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {client.companyName}
                                    <div className="md:hidden text-[10px] text-muted-foreground mt-1">{client.phone || '-'}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="text-sm">{client.contactPerson || '-'}</div>
                                    <div className="text-[10px] text-muted-foreground">{client.email || '-'}</div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {client.showOnHome ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">แสดงผล</Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenEditForm(client)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(client)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ยังไม่มีข้อมูลลูกค้า</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{clientToEdit ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</DialogTitle>
                        <DialogDescription>
                            จัดการข้อมูลลูกค้าองค์กรและรูปภาพโลโก้สำหรับหน้าแรก
                        </DialogDescription>
                    </DialogHeader>
                    <form key={clientToEdit?.id ?? 'create'} action={formAction} className="grid gap-6 py-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="companyName">ชื่อบริษัท *</Label>
                                    <Input id="companyName" name="companyName" defaultValue={clientToEdit?.companyName ?? ''} required placeholder="ระบุชื่อเต็มของบริษัท" />
                                    {formState?.errors?.companyName && <p className="text-xs text-destructive">{formState.errors.companyName[0]}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="contactPerson">ผู้ติดต่อ</Label>
                                    <Input id="contactPerson" name="contactPerson" defaultValue={clientToEdit?.contactPerson ?? ''} placeholder="ชื่อเจ้าหน้าที่ประสานงาน" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                                        <Input id="phone" name="phone" type="tel" defaultValue={clientToEdit?.phone ?? ''} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">อีเมล</Label>
                                        <Input id="email" name="email" type="email" defaultValue={clientToEdit?.email ?? ''} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="logo">โลโก้บริษัท (PNG/JPEG)</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden shrink-0">
                                            {clientToEdit?.logo ? (
                                                <Image src={clientToEdit.logo} alt="Preview" fill className="object-contain p-2" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                            )}
                                        </div>
                                        <Input id="logo" name="logo" type="file" accept="image/*" className="h-auto" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">แนะนำ: รูปทรงสี่เหลี่ยมหรือสี่เหลี่ยมผืนผ้า แบ็คกราวด์โปร่งใส</p>
                                </div>
                                <div className="flex items-center space-x-2 p-4 rounded-xl bg-muted/50 border">
                                    <Checkbox id="showOnHome" name="showOnHome" defaultChecked={clientToEdit?.showOnHome} />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="showOnHome" className="cursor-pointer">แสดงผลบนหน้าแรก</Label>
                                        <p className="text-[10px] text-muted-foreground">นำโลโก้นี้ไปแสดงในส่วน Trusted By บนหน้าแรก</p>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hint">คำใบ้รูปภาพ (สำหรับ AI)</Label>
                                    <Input id="hint" name="hint" defaultValue={clientToEdit?.hint ?? 'company logo'} />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">ที่อยู่และบันทึกเพิ่มเติม</Label>
                            <Textarea id="address" name="address" rows={3} defaultValue={clientToEdit?.address ?? ''} placeholder="ระบุที่อยู่หรือหมายเหตุสำหรับทีมงาน..." />
                        </div>

                        <DialogFooter className="gap-2 pt-4">
                            <DialogClose asChild><Button type="button" variant="ghost" className="rounded-full">ยกเลิก</Button></DialogClose>
                            <SubmitButton isEditing={!!clientToEdit} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ข้อมูลลูกค้า "{clientToDelete?.companyName}" รวมถึงโลโก้จะถูกลบอย่างถาวร
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90 rounded-full">
                           {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ใช่, ลบเลย'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}