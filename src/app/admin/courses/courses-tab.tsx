'use client';

import { useState, useEffect, useActionState, useTransition, useMemo } from 'react';
import type { Course, CourseCategory, CourseType, RegistrationForm, CertificateTemplate, DeliverableConfig, DeliverableType } from '@/lib/course-data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    submitCourse, deleteCourse, updateCourseOrder,
    type FormState as CourseFormState,
} from './actions';
import { useFormStatus } from 'react-dom';

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกหลักสูตร' : 'สร้างหลักสูตร')}
        </Button>
    );
}

const initialCourseState: CourseFormState = { message: '', errors: {}, success: false };

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
        className="h-8 w-20 text-center"
      />
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function CoursesTab({ courses = [], categories = [], types = [], forms = [], certificateTemplates = [] }: { courses: Course[], categories: CourseCategory[], types: CourseType[], forms: RegistrationForm[], certificateTemplates: CertificateTemplate[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Multi-select types logic
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    // Deliverables config
    const DEFAULT_DELIVERABLES: DeliverableConfig[] = [
        { type: 'pvc_card', label: 'บัตร PVC', enabled: false },
        { type: 'prize', label: 'ของรางวัล', enabled: false },
        { type: 'receipt_physical', label: 'ใบเสร็จ (ต้นฉบับ)', enabled: false },
        { type: 'invoice_physical', label: 'ใบแจ้งหนี้ (ต้นฉบับ)', enabled: false },
        { type: 'other', label: 'อื่นๆ', enabled: false, customLabel: '' },
    ];
    const [deliverables, setDeliverables] = useState<DeliverableConfig[]>(DEFAULT_DELIVERABLES);

    const [formState, formAction] = useActionState(submitCourse, initialCourseState);

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

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses
            .filter(course => {
                const matchesCategory = categoryFilter === 'all' || course.categoryId === categoryFilter;
                const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesCategory && matchesSearch;
            })
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0) || a.title.localeCompare(b.title));
    }, [courses, searchQuery, categoryFilter]);

    const handleOpenCreateForm = () => {
        setCourseToEdit(null);
        setSelectedTypes([]);
        setDeliverables(DEFAULT_DELIVERABLES);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (course: Course) => {
        setCourseToEdit(course);
        setSelectedTypes(Array.isArray(course.type) ? course.type : (course.type ? [course.type] : []));
        // Merge saved deliverables with defaults (in case new types added later)
        const saved = course.deliverables || [];
        setDeliverables(DEFAULT_DELIVERABLES.map(d => {
            const found = saved.find(s => s.type === d.type);
            return found ? { ...d, ...found } : d;
        }));
        setIsFormOpen(true);
    };

    const handleOpenDeleteAlert = (course: Course) => { setCourseToDelete(course); setIsDeleteAlertOpen(true); };

    const handleCloseDialogs = () => {
        setIsFormOpen(false);
        setIsDeleteAlertOpen(false);
        setCourseToEdit(null);
        setCourseToDelete(null);
        setSelectedTypes([]);
        setDeliverables(DEFAULT_DELIVERABLES);
    };

    const handleTypeToggle = (typeName: string) => {
        setSelectedTypes(prev => 
            prev.includes(typeName) 
                ? prev.filter(t => t !== typeName) 
                : [...prev, typeName]
        );
    };

    const handleDeleteConfirm = () => {
        if (!courseToDelete) return;
        startTransition(async () => {
            const result = await deleteCourse(courseToDelete.id);
            if (result.success) {
                toast({ title: 'สำเร็จ!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            }
            handleCloseDialogs();
        });
    };

    const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.title || 'ไม่มีหมวดหมู่';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>รายการหลักสูตรทั้งหมด</CardTitle>
                    <Button onClick={handleOpenCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มหลักสูตรใหม่
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                    <div className="relative w-full md:flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="ค้นหาชื่อหลักสูตร..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <div className="w-full md:w-auto">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full md:w-[240px]"><SelectValue placeholder="กรองตามหมวดหมู่" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
                                {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px] text-center">ลำดับ</TableHead>
                            <TableHead>ชื่อหลักสูตร</TableHead>
                            <TableHead>หมวดหมู่</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                            <TableRow key={course.id}>
                                <TableCell><InlineOrderEditor id={course.id} initialOrderIndex={course.orderIndex ?? 0} onUpdateOrder={updateCourseOrder} /></TableCell>
                                <TableCell className="font-medium" title={course.title}>{course.shortName || course.title}</TableCell>
                                <TableCell>{getCategoryName(course.categoryId)}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {Array.isArray(course.type) ? course.type.map(t => (
                                            <Badge key={t} variant="secondary" className="text-[10px] py-0">{t}</Badge>
                                        )) : (course.type && <Badge variant="secondary" className="text-[10px] py-0">{course.type}</Badge>)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleOpenEditForm(course)}><Pencil className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(course)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ไม่พบหลักสูตรที่ตรงกับเงื่อนไข</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                 <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{courseToEdit ? 'แก้ไขหลักสูตร' : 'เพิ่มหลักสูตรใหม่'}</DialogTitle>
                            <DialogDescription className="sr-only">
                              แบบฟอร์มจัดการรายละเอียดหลักสูตรอบรมความปลอดภัย
                            </DialogDescription>
                        </DialogHeader>
                        <form action={formAction} className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-4">
                            <input type="hidden" name="id" value={courseToEdit?.id || ''} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">ชื่อหลักสูตร</Label>
                                    <Input id="title" name="title" defaultValue={courseToEdit?.title ?? ''} required/>
                                    {formState?.errors?.title && <p className="text-sm font-medium text-destructive">{formState.errors.title[0]}</p>}
                                </div>
                                 <div className="grid gap-2">
                                    <Label htmlFor="shortName">ชื่อย่อหลักสูตร (สำหรับทีมงาน)</Label>
                                    <Input id="shortName" name="shortName" defaultValue={courseToEdit?.shortName ?? ''} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">คำอธิบาย</Label>
                                <Textarea id="description" name="description" defaultValue={courseToEdit?.description ?? ''} required />
                                {formState?.errors?.description && <p className="text-sm font-medium text-destructive">{formState.errors.description[0]}</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="categoryId">หมวดหมู่</Label>
                                    <Select name="categoryId" defaultValue={courseToEdit?.categoryId ?? ''} required>
                                        <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                                        <SelectContent>{categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>))}</SelectContent>
                                    </Select>
                                    {formState?.errors?.categoryId && <p className="text-sm font-medium text-destructive">{formState.errors.categoryId[0]}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label className="mb-1">ประเภทการอบรม (เลือกได้หลายประเภท)</Label>
                                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/20">
                                        {types.map(type => (
                                            <div key={type.id} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`type-${type.id}`} 
                                                    name="type" 
                                                    value={type.name}
                                                    checked={selectedTypes.includes(type.name)}
                                                    onCheckedChange={() => handleTypeToggle(type.name)}
                                                />
                                                <Label htmlFor={`type-${type.id}`} className="text-xs font-normal cursor-pointer">{type.name}</Label>
                                            </div>
                                        ))}
                                    </div>
                                    {formState?.errors?.type && <p className="text-sm font-medium text-destructive">{formState.errors.type[0]}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="registrationFormId">แบบฟอร์มสำหรับลงทะเบียน</Label>
                                    <Select name="registrationFormId" defaultValue={courseToEdit?.registrationFormId || 'none'}>
                                        <SelectTrigger><SelectValue placeholder="เลือกแบบฟอร์ม" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- ไม่ใช้แบบฟอร์ม --</SelectItem>
                                            {forms.map(form => (<SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    {formState?.errors?.registrationFormId && <p className="text-sm font-medium text-destructive">{formState.errors.registrationFormId[0]}</p>}
                                </div>
                                 <div className="grid gap-2">
                                    <Label htmlFor="certificateTemplateId">แม่แบบใบประกาศ</Label>
                                    <Select name="certificateTemplateId" defaultValue={courseToEdit?.certificateTemplateId || 'none'}>
                                        <SelectTrigger><SelectValue placeholder="เลือกแม่แบบใบประกาศ" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- ใช้แม่แบบปริยาย --</SelectItem>
                                            {certificateTemplates.map(template => (<SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="price">ราคา</Label>
                                    <Input id="price" name="price" defaultValue={courseToEdit?.price ?? ''} placeholder='เช่น 3,500 บาท หรือ ติดต่อสอบถาม' />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="validityYears">อายุใบรับรอง (ปี)</Label>
                                    <Input id="validityYears" name="validityYears" type="number" defaultValue={courseToEdit?.validityYears ?? ''} placeholder="เช่น 2 (เว้นว่างถ้าไม่มีวันหมดอายุ)"/>
                                </div>
                            </div>
                            <div className="grid gap-2"><Label htmlFor="tags">Tags (คั่นด้วยเครื่องหมายจุลภาค ,)</Label><Input id="tags" name="tags" defaultValue={courseToEdit?.tags?.join(', ') ?? ''} placeholder='เช่น กฎหมายบังคับ, ยอดนิยม' /></div>
                            <div className="grid gap-2"><Label htmlFor="objectives">วัตถุประสงค์ (แต่ละข้อขึ้นบรรทัดใหม่)</Label><Textarea id="objectives" name="objectives" rows={5} defaultValue={courseToEdit?.objectives?.join('\n') ?? ''} placeholder='- เพื่อให้ผู้เข้าอบรมสามารถ...' /></div>
                            <div className="grid gap-2"><Label htmlFor="topics">หัวข้อการอบรม (แต่ละข้อขึ้นบรรทัดใหม่)</Label><Textarea id="topics" name="topics" rows={5} defaultValue={courseToEdit?.topics?.join('\n') ?? ''} placeholder='- หัวข้อที่ 1...' /></div>
                            <div className="grid gap-2"><Label htmlFor="agenda">กำหนดการ (แต่ละข้อขึ้นบรรทัดใหม่)</Label><Textarea id="agenda" name="agenda" rows={5} defaultValue={courseToEdit?.agenda?.join('\n') ?? ''} placeholder='- 09:00 - 10:30 ...' /></div>
                            <div className="grid gap-2"><Label htmlFor="benefits">สิ่งที่ผู้เข้าอบรมจะได้รับ (แต่ละข้อขึ้นบรรทัดใหม่)</Label><Textarea id="benefits" name="benefits" rows={5} defaultValue={courseToEdit?.benefits?.join('\n') ?? ''} placeholder='- ประโยชน์ข้อที่ 1...' /></div>
                            <div className="grid gap-2"><Label htmlFor="qualifications">คุณสมบัติผู้เข้าอบรม (แต่ละข้อขึ้นบรรทัดใหม่)</Label><Textarea id="qualifications" name="qualifications" rows={5} defaultValue={courseToEdit?.qualifications?.join('\n') ?? ''} placeholder='- คุณสมบัติข้อที่ 1...' /></div>
                            <div className="grid gap-2">
                                <Label htmlFor="image">รูปภาพ</Label>
                                <Input id="image" name="image" type="file" accept="image/png, image/jpeg, image/webp" />
                                <p className="text-sm text-muted-foreground">แนะนำ: ขนาด 600x400 pixels. หากไม่ต้องการเปลี่ยน ให้เว้นว่างไว้</p>
                                {courseToEdit?.image && (<div className="mt-2"><p className="text-sm font-medium">รูปภาพปัจจุบัน:</p><Image src={courseToEdit.image} alt={courseToEdit.title} width={150} height={100} className="rounded-md object-cover aspect-[3/2] border"/></div>)}
                            </div>
                            <div className="grid gap-2"><Label htmlFor="hint">คำใบ้รูปภาพ (สำหรับ AI)</Label><Input id="hint" name="hint" defaultValue={courseToEdit?.hint ?? ''} placeholder='เช่น safety training' /></div>
                            <div className="grid gap-2">
                                <Label>รายการจัดส่งหลังอบรม</Label>
                                <p className="text-xs text-muted-foreground">เลือกรายการที่ต้องจัดส่งให้ลูกค้าหลังจากอบรมเสร็จ</p>
                                <div className="border rounded-xl p-4 space-y-3">
                                    {deliverables.map((d, idx) => (
                                        <div key={d.type} className="flex items-center gap-3">
                                            <Checkbox
                                                id={`dlv-${d.type}`}
                                                checked={d.enabled}
                                                onCheckedChange={(checked) => {
                                                    setDeliverables(prev => prev.map((item, i) => i === idx ? { ...item, enabled: !!checked } : item));
                                                }}
                                            />
                                            <Label htmlFor={`dlv-${d.type}`} className="flex-1 cursor-pointer">{d.label}</Label>
                                            {d.type === 'other' && d.enabled && (
                                                <Input
                                                    className="w-48 h-8 text-sm rounded-lg"
                                                    placeholder="ระบุรายการ..."
                                                    value={d.customLabel || ''}
                                                    onChange={e => setDeliverables(prev => prev.map((item, i) => i === idx ? { ...item, customLabel: e.target.value } : item))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <input type="hidden" name="deliverables" value={JSON.stringify(deliverables)} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                                <SubmitButton isEditing={!!courseToEdit} />
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsDeleteAlertOpen(true);}}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle><AlertDialogDescription>การกระทำนี้ไม่สามารถย้อนกลับได้ การลบหลักสูตร "{courseToDelete?.title}" จะเป็นการลบข้อมูลทั้งหมดออกจากระบบ</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ใช่, ลบเลย</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}