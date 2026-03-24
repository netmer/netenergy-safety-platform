'use client';

import { useState, useEffect, useActionState, useTransition, useMemo } from 'react';
import type { Certification } from '@/lib/course-data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, Award, FileText, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createCertification, updateCertification, deleteCertification, updateCertificationOrder, type FormState } from './actions';
import { useFormStatus } from 'react-dom';

const initialFormState: FormState = { message: '', errors: {}, success: undefined };

function SubmitButton({ isEditing, isPending }: { isEditing: boolean, isPending: boolean }) {
    const { pending } = useFormStatus();
    const isLoading = pending || isPending;
    return (
        <Button type="submit" disabled={isLoading} className="rounded-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'กำลังดำเนินการ...' : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มใบรับรอง')}
        </Button>
    );
}

function InlineOrderEditor({ id, initialOrderIndex }: { id: string; initialOrderIndex: number }) {
  const [orderIndex, setOrderIndex] = useState(initialOrderIndex);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleBlur = () => {
    if (orderIndex === initialOrderIndex) return;

    startTransition(async () => {
      const result = await updateCertificationOrder(id, orderIndex);
      if (result.success) {
        toast({ title: 'สำเร็จ', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
        setOrderIndex(initialOrderIndex);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        id={`order-${id}`}
        type="number"
        value={orderIndex}
        onChange={(e) => setOrderIndex(Number(e.target.value))}
        onBlur={handleBlur}
        disabled={isPending}
        className="h-8 w-16 text-center bg-background rounded-md"
      />
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function CertificationsClientPage({ certifications }: { certifications: Certification[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [certToEdit, setCertToEdit] = useState<Certification | null>(null);
    const [certToDelete, setCertToDelete] = useState<Certification | null>(null);

    const sortedCertifications = useMemo(() => {
        return [...certifications].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }, [certifications]);

    const [createState, createAction] = useActionState(createCertification, initialFormState);
    const boundUpdateAction = updateCertification.bind(null, certToEdit?.id ?? '');
    const [updateState, updateAction] = useActionState(boundUpdateAction, initialFormState);

    const formState = certToEdit ? updateState : createState;
    const formAction = certToEdit ? updateAction : createAction;

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

    const handleOpenCreateForm = () => { setCertToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (cert: Certification) => { setCertToEdit(cert); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (cert: Certification) => { setCertToDelete(cert); setIsDeleteAlertOpen(true); };
    const handleCloseDialogs = () => { 
        setIsFormOpen(false); 
        setIsDeleteAlertOpen(false); 
    };

    const handleDeleteConfirm = () => {
        if (!certToDelete) return;
        startTransition(async () => {
            try {
                const result = await deleteCertification(certToDelete);
                if (result.success) {
                    toast({ title: 'สำเร็จ!', description: result.message });
                } else {
                    toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
                }
            } catch (err) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบข้อมูลได้' });
            } finally {
                handleCloseDialogs();
            }
        });
    };

    const isPdf = (url: string | null | undefined) => {
        if (!url) return false;
        return url.toLowerCase().includes('.pdf');
    };

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>ใบรับรองมาตรฐานศูนย์</CardTitle>
                        <CardDescription>จัดการใบเซอร์พร้อมแสดงผลพรีวิวจากเอกสารจริง</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm} className="rounded-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มใบรับรอง
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {sortedCertifications.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {sortedCertifications.map((cert) => (
                            <Card key={cert.id} className="group relative overflow-hidden flex flex-col h-full bg-muted/30 hover:shadow-md transition-all rounded-2xl">
                                <div className="absolute top-2 left-2 z-10">
                                    <InlineOrderEditor id={cert.id} initialOrderIndex={cert.orderIndex ?? 0} />
                                </div>
                                <div className="relative aspect-[1/1.414] overflow-hidden bg-white flex items-center justify-center border-b">
                                    {isPdf(cert.image) ? (
                                        <div className="absolute inset-0 pointer-events-none select-none">
                                            <iframe 
                                                src={`${cert.image}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                                                className="w-[400%] h-[400%] origin-top-left scale-[0.25] border-none"
                                                title={cert.title}
                                            />
                                        </div>
                                    ) : (
                                        <Image 
                                            src={cert.image || "https://placehold.co/600x848?text=No+Image"} 
                                            alt={cert.title || "Certification"}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-105"
                                            data-ai-hint={cert.hint}
                                        />
                                    )}
                                    
                                     <div className="absolute top-2 right-2 z-20">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEditForm(cert)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(cert)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                     </div>
                                </div>
                                <CardContent className="p-4 flex-grow bg-card">
                                    <p className="font-bold text-sm line-clamp-2" title={cert.title}>{cert.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{cert.issuer}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-xl">
                        <Award className="h-12 w-12 mb-4 opacity-20"/>
                        <h3 className="text-lg font-semibold">ยังไม่มีข้อมูลใบรับรอง</h3>
                        <p className="text-sm mt-1">คลิก "เพิ่มใบรับรอง" เพื่อเริ่มต้นใช้งาน</p>
                    </div>
                )}
            </CardContent>
            
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                <DialogContent className="sm:max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>{certToEdit ? 'แก้ไขใบรับรอง' : 'เพิ่มใบรับรองใหม่'}</DialogTitle>
                        <DialogDescription>
                          อัปโหลดไฟล์จริงเพื่อแสดงผลพรีวิวในหน้าแรก
                        </DialogDescription>
                    </DialogHeader>
                    <form key={certToEdit?.id ?? 'create'} action={formAction} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">ชื่อใบรับรอง *</Label>
                            <Input id="title" name="title" defaultValue={certToEdit?.title ?? ''} required placeholder="ชื่อใบรับรองที่จะแสดงผล" />
                            {formState?.errors?.title && <p className="text-xs text-destructive font-medium">{formState.errors.title[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="issuer">ผู้ออกใบรับรอง *</Label>
                            <Input id="issuer" name="issuer" defaultValue={certToEdit?.issuer ?? ''} required placeholder="เช่น กรมสวัสดิการและคุ้มครองแรงงาน" />
                            {formState?.errors?.issuer && <p className="text-xs text-destructive font-medium">{formState.errors.issuer[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="image">อัปโหลดไฟล์ (รูปภาพ หรือ PDF) *</Label>
                            <Input id="image" name="image" type="file" accept="image/*,application/pdf" required={!certToEdit} />
                            {certToEdit?.image && (
                                <div className="mt-2 flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-xs truncate">มีไฟล์เดิมอยู่ในระบบแล้ว</span>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="hint">คำใบ้รูปภาพ (สำหรับ AI)</Label>
                            <Input id="hint" name="hint" defaultValue={certToEdit?.hint ?? 'company certification'} />
                        </div>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild><Button type="button" variant="ghost" className="rounded-full">ยกเลิก</Button></DialogClose>
                            <SubmitButton isEditing={!!certToEdit} isPending={isPending} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ต้องการลบใบรับรอง "{certToDelete?.title}" ใช่หรือไม่? ข้อมูลและไฟล์จะถูกลบอย่างถาวร
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
