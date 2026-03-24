

'use client';

import React, { useState, useEffect, useActionState, useTransition, useRef } from 'react';
import type { RegistrationForm, RegistrationFormField, RegistrationFormSubField } from '@/lib/course-data';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Loader2, FileText, Type, Heading1, RectangleHorizontal, Users, Mail, Phone, Home, Copy, GripVertical, Plus, Building, User, UserSquare, UserCircle, Calendar, School } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createForm, updateForm, deleteForm, type FormState } from './actions';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const initialState: FormState = { message: '', errors: {} };

const subFieldTypeConfig: Record<RegistrationFormSubField['type'], { label: string; icon: React.ElementType }> = {
  text: { label: 'ข้อความ', icon: Type },
  tel: { label: 'เบอร์โทร', icon: Phone },
  file: { label: 'ไฟล์', icon: FileText },
};


function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างแบบฟอร์ม'}
        </Button>
    );
}


function EditableField({ index, field, isSelected, onSelect, onUpdate, onRemove, onDuplicate }) {
    const { type } = field;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({id: field.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };
    
    const handleFieldChange = (prop: keyof RegistrationFormField, value: any) => {
        onUpdate(index, { ...field, [prop]: value });
    };

    const handleSubFieldChange = (subFieldIndex: number, prop: keyof RegistrationFormSubField, value: any) => {
        const newSubFields = [...(field.subFields || [])];
        if (!newSubFields[subFieldIndex]) return;
        newSubFields[subFieldIndex] = { ...newSubFields[subFieldIndex], [prop]: value };
        onUpdate(index, { ...field, subFields: newSubFields });
    };

    const addSubField = (type: RegistrationFormSubField['type'] = 'text') => {
        const newSubFields = [...(field.subFields || []), { id: nanoid(), type: type, label: 'เอกสารเพิ่มเติม', required: false, placeholder: '' }];
        onUpdate(index, { ...field, subFields: newSubFields });
    };

    const removeSubField = (subFieldIndex: number) => {
        const newSubFields = (field.subFields || []).filter((_, i) => i !== subFieldIndex);
        onUpdate(index, { ...field, subFields: newSubFields });
    };


    const renderPreview = () => {
        switch (type) {
            case 'header':
                return (
                    <div className="py-2">
                        <h3 className="text-2xl font-bold">{field.label || 'หัวข้อ'}</h3>
                        <p className="text-muted-foreground">{field.description || 'คำอธิบายเพิ่มเติม'}</p>
                    </div>
                );
            case 'page_break':
                return (
                    <div className="relative py-4">
                        <Separator />
                        <span className="absolute left-1/2 -translate-x-1/2 -top-0 bg-background px-4 text-sm text-muted-foreground">สิ้นสุดหน้า</span>
                    </div>
                );
            case 'coordinator':
                 return (
                     <div>
                        <Label className="font-bold">{field.label || 'ข้อมูลผู้ประสานงาน'}{field.required && <span className="text-destructive"> *</span>}</Label>
                        <div className="mt-2 space-y-4 p-4 border rounded-md bg-white dark:bg-black/20 text-sm text-muted-foreground">
                           <div className="grid grid-cols-2 gap-4">
                             <div><Label>ชื่อ-นามสกุล:</Label><Input disabled /></div>
                             <div><Label>เบอร์โทร:</Label><Input disabled /></div>
                             <div className="col-span-2"><Label>อีเมล:</Label><Input disabled /></div>
                           </div>
                        </div>
                    </div>
                );
            case 'company':
                 return (
                     <div>
                        <Label className="font-bold">{field.label || 'ชื่อบริษัท'}{field.required && <span className="text-destructive"> *</span>}</Label>
                        <Input className="mt-2" placeholder="กรอกชื่อบริษัท..." disabled />
                    </div>
                );
            case 'address':
                return (
                     <div>
                        <Label className="font-bold">{field.label || 'ข้อมูลที่อยู่'}{field.required && <span className="text-destructive"> *</span>}</Label>
                        <div className="mt-2 space-y-4 p-4 border rounded-md bg-white dark:bg-black/20 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground">ที่อยู่ในการออกใบเสร็จ</p>
                            <Input placeholder="บ้านเลขที่, ถนน, ตำบล/แขวง..." disabled />
                            <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="อำเภอ/เขต..." disabled />
                                <Input placeholder="จังหวัด..." disabled />
                            </div>
                            <Input placeholder="รหัสไปรษณีย์" disabled />

                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id={`preview-same-address-${field.id}`} checked disabled />
                                <Label htmlFor={`preview-same-address-${field.id}`} className="font-medium leading-none">
                                    ที่อยู่จัดส่งเหมือนที่อยู่ในการออกใบเสร็จ
                                </Label>
                            </div>
                            
                            <p className="font-semibold text-foreground pt-2">ที่อยู่ในการจัดส่ง</p>
                            <div className="p-4 text-center border-2 border-dashed rounded-md">
                                ส่วนนี้จะถูกซ่อนเมื่อใช้ที่อยู่เดียวกัน
                            </div>
                        </div>
                    </div>
                );
            case 'attendee_list':
                 return (
                    <div>
                        <Label className="font-bold">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
                        <div className="mt-2 p-4 border rounded-md bg-white dark:bg-black/20">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {(field.subFields || []).map(sub => <TableHead key={sub.id}>{sub.label}</TableHead>)}
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={(field.subFields?.length || 0) + 1} className="text-center text-muted-foreground py-6">
                                            ตัวอย่างรายชื่อจะแสดงที่นี่
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                            <Button variant="outline" size="sm" className="mt-4" disabled>
                                <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มผู้เข้าอบรม
                            </Button>
                        </div>
                    </div>
                 );
            default: // Should not happen with new structure
                return (
                    <div>
                        <Label className="font-bold">{field.label || 'คำถาม'}{field.required && <span className="text-destructive"> *</span>}</Label>
                        <Input className="mt-2" placeholder={field.placeholder || ''} disabled />
                    </div>
                );
        }
    };

    const renderEditView = () => (
        <div className="space-y-4">
            {type === 'page_break' ? (
                <div className="text-center text-muted-foreground">--- ตัวแบ่งหน้า ---</div>
            ) : type === 'header' ? (
                 <div className="space-y-2">
                     <Input value={field.label} onChange={(e) => handleFieldChange('label', e.target.value)} className="text-2xl font-bold h-auto p-0 border-none focus-visible:ring-0" placeholder="หัวข้อ" />
                     <Textarea value={field.description} onChange={(e) => handleFieldChange('description', e.target.value)} className="text-base p-0 border-none focus-visible:ring-0" placeholder="คำอธิบาย (ไม่จำเป็น)" />
                 </div>
            ) : (
                <>
                    <div className="flex items-start gap-4">
                         <Input value={field.label} onChange={(e) => handleFieldChange('label', e.target.value)} className="text-base font-bold flex-1" placeholder="ป้ายกำกับฟิลด์" />
                    </div>
                     {type === 'attendee_list' && (
                        <div className="space-y-4 pt-4">
                            <Label className="font-semibold">ฟิลด์ย่อยสำหรับผู้เข้าอบรม</Label>
                            <div className="space-y-3">
                                {(field.subFields || []).map((subField, subIndex) => (
                                    <div key={subField.id} className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Input value={subField.label} onChange={(e) => handleSubFieldChange(subIndex, 'label', e.target.value)} placeholder="ชื่อฟิลด์ย่อย" className="bg-background flex-1"/>
                                                <Select value={subField.type ?? 'text'} onValueChange={(value) => handleSubFieldChange(subIndex, 'type', value)}>
                                                    <SelectTrigger className="w-[150px] bg-background">
                                                        <SelectValue placeholder="เลือกประเภท" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(subFieldTypeConfig).map(([key, { label: sftLabel, icon: SftIcon }]) => (
                                                             <SelectItem key={key} value={key}>
                                                                <div className="flex items-center gap-2"><SftIcon className="h-4 w-4" />{sftLabel}</div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {(subField.type ?? 'text') !== 'file' && (
                                                <Input value={subField.placeholder} onChange={(e) => handleSubFieldChange(subIndex, 'placeholder', e.target.value)} placeholder="Placeholder (ไม่บังคับ)" className="text-xs h-8 bg-background" />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center gap-2 pt-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSubField(subIndex)}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
                                            <div className="flex items-center gap-2">
                                                <Checkbox id={`sub-req-${subField.id}`} checked={subField.required} onCheckedChange={(checked) => handleSubFieldChange(subIndex, 'required', !!checked)} />
                                                <Label htmlFor={`sub-req-${subField.id}`} className="text-xs">จำเป็น</Label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="ghost" className="w-full border-2 border-dashed" onClick={() => addSubField('text')}>
                                <Plus className="mr-2 h-4 w-4" /> เพิ่มฟิลด์ย่อย (ข้อความ/เบอร์โทร)
                            </Button>
                            <Button type="button" variant="ghost" className="w-full border-2 border-dashed" onClick={() => addSubField('file')}>
                                <Plus className="mr-2 h-4 w-4" /> เพิ่มฟิลด์ย่อย (ไฟล์)
                            </Button>
                        </div>
                     )}
                </>
            )}

            <Separator />
            <div className="flex items-center justify-end gap-4">
                 <Button type="button" variant="ghost" size="icon" onClick={() => onDuplicate(index)}><Copy className="w-4 h-4" /><span className="sr-only">คัดลอก</span></Button>
                 <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onRemove(index)}><Trash2 className="w-4 h-4" /><span className="sr-only">ลบ</span></Button>
                 { !['header', 'page_break'].includes(type) && (
                    <div className="flex items-center gap-2 border-l pl-4">
                        <Checkbox id={`required-${field.id}`} checked={field.required} onCheckedChange={(checked) => handleFieldChange('required', !!checked)} />
                        <Label htmlFor={`required-${field.id}`}>จำเป็น</Label>
                    </div>
                 )}
            </div>
        </div>
    );

    return (
        <div ref={setNodeRef} style={style} className="group/field relative" id={`field-${field.id}`}>
            <button
                type="button"
                {...attributes}
                {...listeners}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 -left-8 flex items-center justify-center w-8 h-8 rounded-full cursor-grab transition-opacity opacity-0 group-hover/field:opacity-100 focus:opacity-100",
                    isSelected && "opacity-100",
                    isDragging && "cursor-grabbing"
                )}
                onClick={(e) => e.stopPropagation()}
                aria-label="ลากเพื่อจัดลำดับ"
            >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className={cn("relative p-6 rounded-lg transition-all border", isSelected ? 'border-primary bg-primary/5 shadow-md' : 'bg-card hover:bg-muted/50 border-transparent')} onClick={() => onSelect(index)}>
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-lg" />}
                {isSelected ? renderEditView() : renderPreview()}
            </div>
        </div>
    );
}

function FormBuilder({ defaultValues, formAction }) {
    const [form, setForm] = useState<Omit<RegistrationForm, 'id'>>(
        () => defaultValues || { name: '', description: '', fields: [] }
    );
    const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
    const newlyAddedFieldId = useRef<string | null>(null);

    useEffect(() => {
        if (newlyAddedFieldId.current) {
            const element = document.getElementById(`field-${newlyAddedFieldId.current}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newlyAddedFieldId.current = null;
        }
    }, [form.fields]);


    const updateFormState = (updater) => {
        setForm(prevForm => {
            const newState = typeof updater === 'function' ? updater(prevForm) : updater;
            return newState;
        });
    };
    
    const updateField = (index: number, newFieldData: RegistrationFormField) => {
        const newFields = [...form.fields];
        newFields[index] = newFieldData;
        updateFormState({ ...form, fields: newFields });
    };
    
    const addField = (type: RegistrationFormField['type']) => {
        const newFieldId = nanoid();
        let newField: RegistrationFormField = { id: newFieldId, type, label: '', required: true };
        
        switch (type) {
            case 'coordinator':
                newField.label = 'ข้อมูลผู้ประสานงาน';
                break;
            case 'company':
                newField.label = 'ชื่อบริษัท';
                break;
            case 'address':
                newField.label = 'ข้อมูลที่อยู่';
                break;
            case 'attendee_list':
                newField.label = 'ข้อมูลผู้เข้าอบรม';
                newField.subFields = [
                    // These fields are now part of the main AttendeeData type
                    // and should be handled by the logic that populates the form
                    // This is a structural definition
                ];
                break;
            case 'header':
                newField.label = 'หัวข้อใหม่';
                newField.required = false;
                break;
            case 'page_break':
                newField.label = '';
                newField.required = false;
                break;
        }

        newlyAddedFieldId.current = newFieldId;
        const newFields = [...form.fields, newField];
        updateFormState({ ...form, fields: newFields });
        setSelectedFieldIndex(newFields.length - 1);
    };

    const removeField = (index: number) => {
        const newFields = form.fields.filter((_, i) => i !== index);
        updateFormState({ ...form, fields: newFields });
        setSelectedFieldIndex(null);
    };

    const duplicateField = (index: number) => {
        const fieldToDuplicate = form.fields[index];
        const newFieldId = nanoid();
        const newFields = [
            ...form.fields.slice(0, index + 1),
            { ...fieldToDuplicate, id: newFieldId },
            ...form.fields.slice(index + 1),
        ];
        newlyAddedFieldId.current = newFieldId;
        updateFormState({ ...form, fields: newFields });
        setSelectedFieldIndex(index + 1);
    };

    const moveField = (from: number, to: number) => {
        const newFields = [...form.fields];
        const [movedItem] = newFields.splice(from, 1);
        newFields.splice(to, 0, movedItem);
        updateFormState({ ...form, fields: newFields });
        setSelectedFieldIndex(to);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = form.fields.findIndex((field) => field.id === active.id);
            const newIndex = form.fields.findIndex((field) => field.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                moveField(oldIndex, newIndex);
            }
        }
    }
    
    const toolbarActions = [
        { type: 'coordinator', label: 'ข้อมูลผู้ประสานงาน', icon: User },
        { type: 'company', label: 'ชื่อบริษัท', icon: Building },
        { type: 'attendee_list', label: 'ข้อมูลผู้เข้าอบรม', icon: Users },
        { type: 'address', label: 'ที่อยู่ (จัดส่ง/ใบเสร็จ)', icon: Home },
    ] as const;

    const layoutActions = [
        { type: 'header', label: 'เพิ่มหัวข้อ/คำอธิบาย', icon: Heading1 },
        { type: 'page_break', label: 'เพิ่มตัวแบ่งหน้า', icon: RectangleHorizontal },
    ] as const;

    return (
        <form action={formAction}>
             <input type="hidden" name="formJson" value={JSON.stringify(form)} />
             <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-12 md:col-span-8 lg:col-span-9" onClick={() => setSelectedFieldIndex(null)}>
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <Card className="p-6">
                            <Input value={form.name} onChange={e => updateFormState(f => ({ ...f, name: e.target.value }))} placeholder="ชื่อแบบฟอร์ม" className="text-3xl font-bold h-auto p-2 border-none focus-visible:ring-0" required />
                            <Textarea value={form.description} onChange={e => updateFormState(f => ({ ...f, description: e.target.value }))} placeholder="คำอธิบายแบบฟอร์ม (ไม่จำเป็น)" className="text-base p-2 border-none focus-visible:ring-0" />
                        </Card>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={form.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                {form.fields.map((field, index) => (
                                    <EditableField
                                        key={field.id}
                                        field={field}
                                        index={index}
                                        isSelected={selectedFieldIndex === index}
                                        onSelect={setSelectedFieldIndex}
                                        onUpdate={updateField}
                                        onRemove={removeField}
                                        onDuplicate={duplicateField}
                                    />
                                ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        {form.fields.length === 0 && (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">ยังไม่มีฟิลด์ในฟอร์มนี้</p>
                                <p className="text-sm mt-2">คลิกเพิ่มบล็อกข้อมูลจากเมนูด้านข้าง</p>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="col-span-12 md:col-span-4 lg:col-span-3">
                    <Card className="sticky top-4 p-2">
                        <CardHeader className='p-2 pt-0'>
                            <CardTitle className="text-base">บล็อกข้อมูล</CardTitle>
                        </CardHeader>
                         <div className="flex flex-col gap-2">
                            {toolbarActions.map(({ type, label, icon: Icon }) => (
                                <Button key={type} type="button" variant="ghost" className="justify-start gap-2" onClick={() => addField(type)}>
                                    <Icon className="h-5 w-5" />
                                    <span>{label}</span>
                                </Button>
                            ))}
                         </div>
                         <Separator className="my-2" />
                         <CardHeader className='p-2 pt-0'>
                            <CardTitle className="text-base">เครื่องมือจัดหน้า</CardTitle>
                        </CardHeader>
                         <div className="flex flex-col gap-2">
                            {layoutActions.map(({ type, label, icon: Icon }) => (
                                <Button key={type} type="button" variant="ghost" className="justify-start gap-2" onClick={() => addField(type)}>
                                    <Icon className="h-5 w-5" />
                                    <span>{label}</span>
                                </Button>
                            ))}
                         </div>
                    </Card>
                 </div>
             </div>
             <DialogFooter className="mt-8">
                <DialogClose asChild><Button type="button" variant="ghost">ยกเลิก</Button></DialogClose>
                <SubmitButton isEditing={!!defaultValues?.id} />
            </DialogFooter>
        </form>
    );
}

export function FormsClientPage({ forms }: { forms: RegistrationForm[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [formToEdit, setFormToEdit] = useState<RegistrationForm | null>(null);
    const [formToDelete, setFormToDelete] = useState<RegistrationForm | null>(null);

    const [createState, createFormAction] = useActionState(createForm, initialState);
    const boundUpdateAction = updateForm.bind(null, formToEdit?.id ?? '');
    const [updateState, updateFormAction] = useActionState(boundUpdateAction, initialState);

    const formState = formToEdit ? updateState : createState;
    const formAction = formToEdit ? updateFormAction : createFormAction;

    useEffect(() => {
        if (!formState.message) return;
        
        if (formState.errors || formState.message?.includes('Error')) {
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: formState.message });
        } else {
            toast({ title: "สำเร็จ!", description: formState.message });
            handleCloseDialogs();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formState]);

    const handleOpenCreateForm = () => {
        setFormToEdit(null);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (form: RegistrationForm) => {
        setFormToEdit(form);
        setIsFormOpen(true);
    };
    
    const handleOpenDeleteAlert = (form: RegistrationForm) => {
        setFormToDelete(form);
        setIsDeleteAlertOpen(true);
    };

    const handleCloseDialogs = () => {
        setIsFormOpen(false);
        setIsDeleteAlertOpen(false);
        setFormToEdit(null);
        setFormToDelete(null);
    };

    const handleDeleteConfirm = () => {
        if (!formToDelete) return;
        startTransition(async () => {
            const result = await deleteForm(formToDelete.id);
            if (result.message.includes('Error')) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: result.message });
            } else {
                toast({ title: 'สำเร็จ!', description: result.message });
            }
            handleCloseDialogs();
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>จัดการแบบฟอร์มลงทะเบียน</CardTitle>
                            <CardDescription>
                                สร้างและแก้ไขแม่แบบฟอร์มสำหรับใช้ในแต่ละหลักสูตร
                            </CardDescription>
                        </div>
                        <Button onClick={handleOpenCreateForm}>
                            <PlusCircle className="mr-2 h-4 w-4" /> สร้างแบบฟอร์มใหม่
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ชื่อแบบฟอร์ม</TableHead>
                                <TableHead>จำนวนฟิลด์</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {forms.map((form) => (
                                <TableRow key={form.id}>
                                    <TableCell className="font-medium">{form.name}</TableCell>
                                    <TableCell>{form.fields?.length ?? 0}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenEditForm(form)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    แก้ไข
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteAlert(form)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    ลบ
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsFormOpen(true);}}>
                <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText />
                            {formToEdit ? 'แก้ไขแบบฟอร์ม' : 'สร้างแบบฟอร์มใหม่'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto -mx-6 px-6">
                        <FormBuilder
                            key={formToEdit?.id ?? 'create'}
                            defaultValues={formToEdit}
                            formAction={formAction}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialogs(); else setIsDeleteAlertOpen(true);}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ การลบแบบฟอร์ม "{formToDelete?.name}" จะเป็นการลบข้อมูลทั้งหมดออกจากระบบ และอาจส่งผลต่อหลักสูตรที่ใช้ฟอร์มนี้อยู่
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
        </>
    );
}
