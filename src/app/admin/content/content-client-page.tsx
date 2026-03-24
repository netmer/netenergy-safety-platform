
'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { BlogPost } from '@/lib/blog-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, Newspaper } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createBlogPost, updateBlogPost, deleteBlogPost, type FormState } from './actions';
import { useFormStatus } from 'react-dom';

const initialFormState: FormState = { success: false, message: '', errors: {} };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างบทความ'}
        </Button>
    );
}

export function ContentClientPage({ posts }: { posts: BlogPost[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [postToEdit, setPostToEdit] = useState<BlogPost | null>(null);
    const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

    const [createState, createAction] = useActionState(createBlogPost, initialFormState);
    const boundUpdateAction = updateBlogPost.bind(null, postToEdit?.slug ?? '');
    const [updateState, updateAction] = useActionState(boundUpdateAction, initialFormState);

    const formState = postToEdit ? updateState : createState;
    const formAction = postToEdit ? updateAction : createAction;

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

    const handleOpenCreateForm = () => { setPostToEdit(null); setIsFormOpen(true); };
    const handleOpenEditForm = (post: BlogPost) => { setPostToEdit(post); setIsFormOpen(true); };
    const handleOpenDeleteAlert = (post: BlogPost) => { setPostToDelete(post); setIsDeleteAlertOpen(true); };
    const handleCloseDialogs = () => { setIsFormOpen(false); setIsDeleteAlertOpen(false); };

    const handleDeleteConfirm = () => {
        if (!postToDelete) return;
        startTransition(async () => {
            const result = await deleteBlogPost(postToDelete.slug);
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
                        <CardTitle>จัดการบทความ</CardTitle>
                        <CardDescription>เพิ่ม, แก้ไข, และลบบทความในหน้าข่าวสาร</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มบทความใหม่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อบทความ</TableHead>
                            <TableHead>ผู้เขียน</TableHead>
                            <TableHead>หมวดหมู่</TableHead>
                            <TableHead>วันที่เผยแพร่</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.length > 0 ? posts.map((post) => (
                            <TableRow key={post.slug}>
                                <TableCell className="font-medium">{post.title}</TableCell>
                                <TableCell>{post.author}</TableCell>
                                <TableCell>{post.category}</TableCell>
                                <TableCell>{format(new Date(post.date), 'd MMM yyyy', { locale: th })}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleOpenEditForm(post)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(post)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ยังไม่มีบทความ</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsFormOpen(true);}}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{postToEdit ? 'แก้ไขบทความ' : 'สร้างบทความใหม่'}</DialogTitle>
                         <DialogDescription>
                            กรอกข้อมูลสำหรับบทความที่จะแสดงในหน้าข่าวสาร
                        </DialogDescription>
                    </DialogHeader>
                    <form key={postToEdit?.slug ?? 'create'} action={formAction} className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-4">
                         <div className="grid gap-2">
                            <Label htmlFor="title">ชื่อบทความ *</Label>
                            <Input id="title" name="title" defaultValue={postToEdit?.title ?? ''} required/>
                            {formState?.errors?.title && <p className="text-sm font-medium text-destructive">{formState.errors.title[0]}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="author">ผู้เขียน *</Label>
                                <Input id="author" name="author" defaultValue={postToEdit?.author ?? 'ทีมงาน NET'} required />
                                 {formState?.errors?.author && <p className="text-sm font-medium text-destructive">{formState.errors.author[0]}</p>}
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="category">หมวดหมู่ *</Label>
                                <Input id="category" name="category" defaultValue={postToEdit?.category ?? 'บทความ'} required/>
                                 {formState?.errors?.category && <p className="text-sm font-medium text-destructive">{formState.errors.category[0]}</p>}
                            </div>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="excerpt">เนื้อหาย่อ *</Label>
                            <Textarea id="excerpt" name="excerpt" rows={4} defaultValue={postToEdit?.excerpt ?? ''} required />
                            {formState?.errors?.excerpt && <p className="text-sm font-medium text-destructive">{formState.errors.excerpt[0]}</p>}
                        </div>

                         <div className="grid gap-2">
                            <Label htmlFor="image">รูปภาพหน้าปก *</Label>
                            <Input id="image" name="image" type="file" accept="image/png, image/jpeg, image/webp" required={!postToEdit} />
                            <p className="text-sm text-muted-foreground">ขนาดที่แนะนำ: 1200x675 pixels. หากไม่ต้องการเปลี่ยน ให้เว้นว่างไว้</p>
                            {postToEdit?.image && (<div className="mt-2"><p className="text-sm font-medium">รูปภาพปัจจุบัน:</p><Image src={postToEdit.image} alt={postToEdit.title} width={200} height={113} className="rounded-md object-cover aspect-video border"/></div>)}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="hint">คำใบ้รูปภาพ (สำหรับ AI)</Label>
                            <Input id="hint" name="hint" defaultValue={postToEdit?.hint ?? 'blog article'} placeholder='เช่น safety inspection'/>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                            <SubmitButton isEditing={!!postToEdit} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsDeleteAlertOpen(true);}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ การลบบทความ "{postToDelete?.title}" จะเป็นการลบข้อมูลทั้งหมดออกจากระบบอย่างถาวร
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
