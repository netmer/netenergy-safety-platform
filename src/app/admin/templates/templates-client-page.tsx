'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import type { CertificateTemplate } from '@/lib/course-data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, FileSignature } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createTemplate, updateTemplate, deleteTemplate, type FormState } from './actions';
import { useFormStatus } from 'react-dom';


const initialFormState: FormState = { message: '', errors: {} };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? (isEditing ? 'กำลังบันทึก...' : 'กำลังสร้าง...') : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างแม่แบบ')}
        </Button>
    );
}

export function TemplatesClientPage({ templates }: { templates: CertificateTemplate[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<CertificateTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<CertificateTemplate | null>(null);

    const [createState, createAction] = useActionState(createTemplate, initialFormState);
    const boundUpdateAction = updateTemplate.bind(null, templateToEdit?.id ?? '');
    const [updateState, updateAction] = useActionState(boundUpdateAction, initialFormState);

    const formState = templateToEdit ? updateState : createState;
    const formAction = templateToEdit ? updateAction : createAction;

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

    const handleOpenCreateForm = () => { setTemplateToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (template: CertificateTemplate) => { setTemplateToEdit(template); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (template: CertificateTemplate) => { setTemplateToDelete(template); setIsDeleteAlertOpen(true); };
    const handleCloseDialogs = () => { setIsFormOpen(false); setIsDeleteAlertOpen(false); };

    const handleDeleteConfirm = () => {
        if (!templateToDelete) return;
        startTransition(async () => {
            const result = await deleteTemplate(templateToDelete);
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
            } else {
                 toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            handleCloseDialogs();
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>จัดการแม่แบบใบประกาศ</CardTitle>
                        <CardDescription>สร้างและแก้ไขแม่แบบสำหรับใบประกาศนียบัตรของแต่ละหลักสูตร</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มแม่แบบใหม่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {templates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {templates.map((template) => (
                            <Card key={template.id} className="group">
                                <CardHeader className="p-0 relative">
                                    <Image 
                                        src={template.backgroundImageUrl} 
                                        alt={template.name}
                                        width={400}
                                        height={283}
                                        className="object-cover aspect-[1.414/1] rounded-t-lg"
                                        data-ai-hint={template.hint}
                                    />
                                     <div className="absolute top-2 right-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="secondary" className="h-8 w-8 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenEditForm(template)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(template)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                     </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <p className="font-semibold truncate" title={template.name}>{template.name}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                        <FileSignature className="h-12 w-12 mb-4"/>
                        <h3 className="text-lg font-semibold">ยังไม่มีแม่แบบใบประกาศ</h3>
                        <p className="text-sm mt-1">คลิก "เพิ่มแม่แบบใหม่" เพื่อเริ่มต้น</p>
                    </div>
                )}
            </CardContent>
            
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsFormOpen(true);}}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{templateToEdit ? 'แก้ไขแม่แบบ' : 'เพิ่มแม่แบบใหม่'}</DialogTitle>
                        <DialogDescription className="sr-only">
                          ฟอร์มจัดการแม่แบบพื้นหลังสำหรับพิมพ์ใบประกาศนียบัตร
                        </DialogDescription>
                    </DialogHeader>
                    <form key={templateToEdit?.id ?? 'create'} action={formAction} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">ชื่อแม่แบบ</Label>
                            <Input id="name" name="name" defaultValue={templateToEdit?.name ?? ''} required />
                            {formState?.errors?.name && <p className="text-sm font-medium text-destructive">{formState.errors.name[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="image">รูปภาพพื้นหลัง</Label>
                            <Input id="image" name="image" type="file" accept="image/png, image/jpeg, image/webp" required={!templateToEdit} />
                            <p className="text-sm text-muted-foreground">ขนาดที่แนะนำ: A4 landscape (เช่น 1123x794 pixels). หากไม่ต้องการเปลี่ยน ให้เว้นว่างไว้</p>
                            {templateToEdit?.backgroundImageUrl && (<div className="mt-2"><p className="text-sm font-medium">รูปภาพปัจจุบัน:</p><Image src={templateToEdit.backgroundImageUrl} alt={templateToEdit.name} width={200} height={141} className="rounded-md object-cover border"/></div>)}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="hint">คำใบ้รูปภาพ (สำหรับ AI)</Label>
                            <Input id="hint" name="hint" defaultValue={templateToEdit?.hint ?? 'certificate background'} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                            <SubmitButton isEditing={!!templateToEdit} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsDeleteAlertOpen(true);}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ การลบแม่แบบ "{templateToDelete?.name}" จะเป็นการลบรูปภาพและข้อมูลออกจากระบบอย่างถาวร
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