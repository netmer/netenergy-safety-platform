'use client';

import React, { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { nanoid } from 'nanoid';
import type { Registration, TrainingSchedule, RegistrationFormField, RegistrationAttendee, RegistrationFormSubField } from '@/lib/course-data';
import { updateRegistrationData } from '../../actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2, Save, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentThumbnail } from '@/components/document-thumbnail';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} size="lg">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                </>
            ) : <> <Save className="mr-2 h-4 w-4"/> บันทึกการเปลี่ยนแปลง </>}
        </Button>
    );
}

const addressFieldKeys = [
    { name: 'address1', label: 'ที่อยู่ (บ้านเลขที่, ถนน)', required: true, span: 'md:col-span-2' },
    { name: 'subdistrict', label: 'ตำบล/แขวง', required: true, span: '' },
    { name: 'district', label: 'อำเภอ/เขต', required: true, span: '' },
    { name: 'province', label: 'จังหวัด', required: true, span: '' },
    { name: 'postalCode', label: 'รหัสไปรษณีย์', required: true, span: '' },
    { name: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน', required: true, span: 'md:col-span-2' },
] as const;


interface AttendeeSubFormProps {
    attendee: Partial<RegistrationAttendee> & { id: string };
    subFields: RegistrationFormField['subFields'];
    onRemove: (id: string) => void;
    onChange: (attendeeId: string, prop: string, value: any) => void;
    onFileChange: (attendeeId: string, subFieldId: string, file: File | undefined) => void;
}


function AttendeeSubForm({ attendee, subFields, onRemove, onChange, onFileChange }: AttendeeSubFormProps) {
    return (
         <Card className="relative bg-muted/50 text-left">
            <CardHeader className='pb-4'>
                <CardTitle className='text-base'>ผู้อบรม</CardTitle>
                 <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => onRemove(attendee.id)}>
                    <Trash2 className="h-4 w-4"/>
                    <span className="sr-only">ลบผู้อบรม</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                 {(subFields || []).map(subField => (
                     <div className="space-y-2" key={subField.id}>
                         <Label htmlFor={`${attendee.id}-${subField.id}`}>{subField.label}{subField.required && <span className="text-destructive"> *</span>}</Label>
                         {subField.type === 'file' ? (
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-20">
                                    <DocumentThumbnail fileUrl={attendee[subField.id] || ''} fileName={subField.label} />
                                </div>
                                <Input 
                                    id={`file-${attendee.id}-${subField.id}`} 
                                    name={`file-${attendee.id}-${subField.id}`}
                                    type="file"
                                    onChange={(e) => onFileChange(attendee.id, subField.id, e.target.files?.[0])}
                                />
                            </div>
                         ) : (
                            <Input 
                                id={`${attendee.id}-${subField.id}`} 
                                name={`${attendee.id}-${subField.id}`} 
                                value={attendee[subField.id] || ''} 
                                onChange={(e) => onChange(attendee.id, subField.id, e.target.value)} 
                                required={subField.required}
                                placeholder={subField.placeholder}
                            />
                         )}
                     </div>
                 ))}
            </CardContent>
        </Card>
    )
}


export function EditRegistrationForm({ registration, availableSchedules }: { registration: Registration, availableSchedules: TrainingSchedule[]}) {
    const { toast } = useToast();
    const [formData, setFormData] = useState(registration.formData);
    const [state, formAction] = useActionState(updateRegistrationData.bind(null, registration.id), { success: false, message: ''});
    
    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({ title: "สำเร็จ!", description: state.message });
            } else {
                 toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: state.message });
            }
        }
    }, [state, toast]);

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleCoordinatorChange = (fieldId: string, prop: 'name' | 'tel' | 'email', value: string) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: {
                ...(prev[fieldId] || {}),
                [prop]: value,
            },
        }));
    };
    
    const handleAttendeeChange = (attendeeId: string, prop: string, value: any) => {
        const attendeeListField = registration.formSchema.find(f => f.type === 'attendee_list');
        if (!attendeeListField) return;

        setFormData(prev => {
            const list = prev[attendeeListField.id] || [];
            return {
                ...prev,
                [attendeeListField.id]: list.map(att => att.id === attendeeId ? { ...att, [prop]: value } : att)
            }
        });
    };

    const handleAttendeeFileChange = (attendeeId: string, subFieldId: string, file: File | undefined) => {
        // The file itself is handled by the form submission.
    }
    
    const addAttendee = (fieldId: string) => {
        const attendeeListField = registration.formSchema.find(f => f.id === fieldId);
        if (!attendeeListField) return;

        const newAttendee = { 
            id: nanoid(), 
            status: 'pending',
            ...(attendeeListField.subFields || []).reduce((acc, sf) => ({...acc, [sf.id]: ''}), {})
        };
        
        setFormData(prev => {
             const list = prev[fieldId] || [];
             return { ...prev, [fieldId]: [...list, newAttendee] }
        });
    };

     const removeAttendee = (fieldId: string, attendeeId: string) => {
        setFormData(prev => {
            const list = prev[fieldId] || [];
            return { ...prev, [fieldId]: list.filter(att => att.id !== attendeeId) };
        });
    };
    
    const renderField = (field: RegistrationFormField) => {
        switch (field.type) {
            case 'header':
                return (
                    <div className="py-4 first:pt-0 text-left" key={field.id}>
                        <h3 className="text-xl font-semibold">{field.label}</h3>
                        {field.description && <p className="text-muted-foreground mt-1">{field.description}</p>}
                    </div>
                );
            case 'page_break':
                return <Separator className="my-8" key={field.id} />;
            case 'coordinator':
                const coordValue = formData[field.id] || { name: '', tel: '', email: '' };
                return (
                    <div key={field.id} className="space-y-4 text-left">
                        <Label className="font-semibold text-lg">{field.label}</Label>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ชื่อ-นามสกุล</Label>
                                <Input value={coordValue.name || ''} onChange={e => handleCoordinatorChange(field.id, 'name', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label>เบอร์โทร</Label>
                                <Input type="tel" value={coordValue.tel || ''} onChange={e => handleCoordinatorChange(field.id, 'tel', e.target.value)} />
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label>อีเมล</Label>
                                <Input type="email" value={coordValue.email || ''} onChange={e => handleCoordinatorChange(field.id, 'email', e.target.value)} />
                            </div>
                        </div>
                    </div>
                );
            case 'company':
                return (
                     <div className="space-y-2 text-left" key={field.id}>
                        <Label className="font-semibold text-lg">{field.label}</Label>
                        <Input value={formData[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder={field.placeholder} />
                    </div>
                );
            case 'address':
                const addressValue = formData[field.id] || {};
                return (
                    <div className="space-y-6 text-left" key={field.id}>
                        <Label className="font-semibold text-lg">{field.label}</Label>
                        <div className="space-y-4 pl-4 border-l-2">
                             <Label className="font-medium">ที่อยู่ในการออกใบเสร็จ</Label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {addressFieldKeys.map(key => (
                                    <div className={`space-y-1.5 ${key.span}`} key={`billing_${key.name}`}>
                                        <Label className="text-sm">{key.label}</Label>
                                        <Input value={addressValue.billingAddress?.[key.name] || ''} onChange={e => handleFieldChange(field.id, {...addressValue, billingAddress: {...addressValue.billingAddress, [key.name]: e.target.value}})} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id={`${field.id}_same`} checked={addressValue.isShippingSameAsBilling} onCheckedChange={(checked) => handleFieldChange(field.id, {...addressValue, isShippingSameAsBilling: !!checked})} />
                            <Label htmlFor={`${field.id}_same`}>ที่อยู่จัดส่งเหมือนที่อยู่ในการออกใบเสร็จ</Label>
                        </div>
                        {!addressValue.isShippingSameAsBilling && (
                            <div className="space-y-4 pl-4 border-l-2 animate-in fade-in-50">
                                <Label className="font-medium">ที่อยู่ในการจัดส่ง</Label>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {addressFieldKeys.map(key => (
                                        <div className={`space-y-1.5 ${key.name === 'taxId' ? 'hidden' : key.span}`} key={`shipping_${key.name}`}>
                                            {key.name !== 'taxId' && (
                                                <>
                                                    <Label className="text-sm">{key.label}</Label>
                                                    <Input value={addressValue.shippingAddress?.[key.name] || ''} onChange={e => handleFieldChange(field.id, {...addressValue, shippingAddress: {...addressValue.shippingAddress, [key.name]: e.target.value}})} />
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'attendee_list':
                const attendees = formData[field.id] || [];
                return (
                     <div className="space-y-4 text-left" key={field.id}>
                         <Label className="font-semibold text-lg">{field.label}</Label>
                         <div className="space-y-6">
                            {(attendees).map((attendee: any) => (
                               <AttendeeSubForm 
                                key={attendee.id} 
                                attendee={attendee}
                                subFields={field.subFields}
                                onRemove={() => removeAttendee(field.id, attendee.id)} 
                                onChange={handleAttendeeChange}
                                onFileChange={handleAttendeeFileChange}
                               />
                            ))}
                            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => addAttendee(field.id)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มผู้อบรม
                            </Button>
                         </div>
                     </div>
                );
            case 'select':
                return (
                    <div className="space-y-2 text-left" key={field.id}>
                        <Label className="font-semibold text-lg">{field.label}</Label>
                        <Select 
                            value={formData[field.id] || ''} 
                            onValueChange={(val) => handleFieldChange(field.id, val)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="เลือกรายการ..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(field.options || []).map(opt => (
                                    <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            case 'radio':
                return (
                    <div className="space-y-2 text-left" key={field.id}>
                        <Label className="font-semibold text-lg mb-3 block">{field.label}</Label>
                        <RadioGroup 
                            value={formData[field.id] || ''} 
                            onValueChange={(val) => handleFieldChange(field.id, val)}
                            className="space-y-2"
                        >
                            {(field.options || []).map(opt => (
                                <div key={opt.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt.value} id={`${field.id}-${opt.id}`} />
                                    <Label htmlFor={`${field.id}-${opt.id}`}>{opt.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                );
            case 'textarea':
                return (
                    <div className="space-y-2 text-left" key={field.id}>
                        <Label className="font-semibold text-lg">{field.label}</Label>
                        <Textarea 
                            value={formData[field.id] || ''} 
                            onChange={e => handleFieldChange(field.id, e.target.value)} 
                            placeholder={field.placeholder}
                        />
                    </div>
                );
            case 'text':
            case 'email':
            case 'tel':
                return (
                    <div className="space-y-2 text-left" key={field.id}>
                        <Label className="font-semibold text-lg">{field.label}</Label>
                        <Input 
                            type={field.type}
                            value={formData[field.id] || ''} 
                            onChange={e => handleFieldChange(field.id, e.target.value)} 
                            placeholder={field.placeholder}
                        />
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <Card>
            <form action={formAction}>
                <input type="hidden" name="jsonData" value={JSON.stringify({ formData: formData, formSchema: registration.formSchema })} />
                <CardContent className="pt-6 space-y-6">
                    {registration.formSchema.map(renderField)}
                </CardContent>
                <CardFooter className="bg-muted/50 p-6 border-t">
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}