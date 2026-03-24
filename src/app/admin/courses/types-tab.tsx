'use client';

import { useState, useEffect, useActionState, useTransition, useRef } from 'react';
import type { CourseType } from '@/lib/course-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    createType, deleteType,
    type FormState as TypeFormState,
} from './actions';
import { useFormStatus } from 'react-dom';

const initialTypeState: TypeFormState = { message: '', errors: {}, success: undefined };

export function TypesTab({ types }: { types: CourseType[] }) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, startTransition] = useTransition();
    const [typeToDelete, setTypeToDelete] = useState<CourseType | null>(null);

    const [createState, createTypeAction] = useActionState(createType, initialTypeState);

    useEffect(() => {
        if (createState.success === undefined) return;
        
        if (createState.success) {
            toast({ title: "สำเร็จ!", description: createState.message });
            formRef.current?.reset();
        } else {
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: createState.message });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createState]);
    
    const handleDeleteConfirm = () => {
        if (!typeToDelete) return;
        startTransition(async () => {
            const result = await deleteType(typeToDelete.id);
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            setTypeToDelete(null);
        });
    };

    return (
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle>เพิ่มประเภทหลักสูตร</CardTitle><CardDescription>เช่น อบรมใหม่, อบรมทบทวน</CardDescription></CardHeader>
                    <CardContent>
                        <form ref={formRef} action={createTypeAction} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">ชื่อประเภท</Label>
                                <Input id="name" name="name" required placeholder="ชื่อประเภทการอบรม" />
                                {createState?.errors?.name && <p className="text-xs text-destructive">{createState.errors.name[0]}</p>}
                            </div>
                            <Button type="submit" className="w-full rounded-full" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                เพิ่มประเภท
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle>รายการประเภททั้งหมด</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>ชื่อประเภท</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {types.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setTypeToDelete(type)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {types.length === 0 && (<TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">ยังไม่มีประเภทหลักสูตร</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader><AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle><AlertDialogDescription>การลบข้อมูลประเภทจะไม่สามารถย้อนกลับได้</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90 rounded-full">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ใช่, ลบเลย'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}