
'use client';

import React, { useState, useEffect, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { nanoid } from 'nanoid';
import { useAuth } from '@/context/auth-context';
import type { Course, TrainingSchedule, RegistrationForm, RegistrationFormField, RegistrationAttendee, Client } from '@/lib/course-data';
import { submitRegistration, getLatestRegistrationForUser, type RegistrationFormState } from '../actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Trash2, CheckCircle, File as FileIcon, Sparkles, User, Building, LogIn, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface RegistrationClientPageProps {
    course: Course;
    schedule: TrainingSchedule;
    form: RegistrationForm;
    clients: Client[];
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full h-14 text-lg rounded-2xl shadow-xl shadow-primary/20">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    กำลังส่งข้อมูล...
                </>
            ) : 'ยืนยันการลงทะเบียน'}
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

function AttendeeSubForm({ attendee, subFields, onRemove, required }: { attendee: Partial<RegistrationAttendee> & {id: string}, subFields: RegistrationFormField['subFields'], onRemove: (id: string) => void, required: boolean}) {
    return (
         <Card className="relative bg-slate-50 dark:bg-slate-900 border-dashed border-2 rounded-2xl overflow-hidden">
            <CardHeader className='pb-4 flex flex-row items-center justify-between space-y-0'>
                <CardTitle className='text-base font-bold'>ผู้เข้าอบรม</CardTitle>
                 <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onRemove(attendee.id)}>
                    <Trash2 className="h-4 w-4"/>
                    <span className="sr-only">ลบผู้เข้าอบรม</span>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {(subFields || []).map(subField => (
                    <div key={subField.id} className="space-y-2 text-left">
                        <Label htmlFor={`${subField.id}-${attendee.id}`} className="text-sm font-medium">{subField.label}{required && subField.required && <span className="text-destructive"> *</span>}</Label>
                        <Input 
                            id={`${subField.id}-${attendee.id}`} 
                            name={`${subField.id}-${attendee.id}`} 
                            type={subField.type} 
                            accept={subField.type === 'file' ? 'image/*,application/pdf' : undefined}
                            placeholder={subField.placeholder}
                            required={required && subField.required}
                            className="rounded-xl"
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export function RegistrationClientPage({ course, schedule, form, clients }: RegistrationClientPageProps) {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    const [state, formAction] = useActionState(submitRegistration, { success: false, message: '' });
    
    const [isAutoFilling, setIsAutoFilling] = useState(true);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [attendees, setAttendees] = useState<(Partial<RegistrationAttendee> & {id: string})[]>([]);
    const [registrationType, setRegistrationType] = useState<'company' | 'individual'>('company');

    useEffect(() => {
      const initialFormData: Record<string, any> = {};
      form.fields.forEach(field => {
        if (field.type === 'coordinator') {
          initialFormData[field.id] = { name: '', tel: '', email: '' };
        } else if (field.type === 'address') {
          initialFormData[field.id] = {
            isShippingSameAsBilling: true,
            billingAddress: {},
            shippingAddress: {}
          };
        } else if (field.type === 'select' || field.type === 'radio') {
          initialFormData[field.id] = '';
        } else {
          initialFormData[field.id] = '';
        }
      });
      initialFormData['clientCompanyName'] = '';
      setFormData(initialFormData);
    }, [form.fields]);

    useEffect(() => {
        if (state.message && !state.success) {
            toast({
                variant: 'destructive',
                title: 'เกิดข้อผิดพลาด',
                description: state.message,
            });
        }
    }, [state, toast]);

    useEffect(() => {
        if (user && !loading) {
            const autoFillData = async () => {
                try {
                    const lastReg = await getLatestRegistrationForUser(user.uid);
                    if (lastReg) {
                        const oldData = lastReg.formData;
                        const newFormData = { ...formData };

                        form.fields.forEach(field => {
                          if (oldData[field.id]) {
                            if (['coordinator', 'address', 'text', 'textarea', 'email', 'tel', 'select', 'radio'].includes(field.type)) {
                                newFormData[field.id] = oldData[field.id];
                            }
                          }
                        });

                        if(lastReg.clientCompanyName) {
                            newFormData['clientCompanyName'] = lastReg.clientCompanyName;
                        }
                        
                        // Set registration type based on previous data if available
                        if (lastReg.formData.registrationType) {
                            setRegistrationType(lastReg.formData.registrationType);
                        }

                        setFormData(newFormData);
                        toast({ 
                            title: 'ระบบเติมข้อมูลให้อัตโนมัติ', 
                            description: 'เราดึงข้อมูลล่าสุดของคุณมาให้เพื่อความสะดวกรวดเร็วครับ' 
                        });
                    }
                } catch (error) {
                    console.error('Failed to auto-fill', error);
                } finally {
                    setIsAutoFilling(false);
                }
            };
            autoFillData();
        } else if (!loading) {
            setIsAutoFilling(false);
        }
    }, [user, loading, toast, form.fields]);

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const addAttendee = () => {
        setAttendees(prev => [...prev, { id: nanoid() }]);
    };

    const removeAttendee = (attendeeId: string) => {
        setAttendees(prev => prev.filter(a => a.id !== attendeeId));
    };

    const renderField = (field: RegistrationFormField) => {
        switch (field.type) {
            case 'header':
                return (
                    <div className="py-6 first:pt-0" key={field.id}>
                        <h3 className="text-2xl font-bold font-headline">{field.label}</h3>
                        {field.description && <p className="text-muted-foreground mt-2 font-light">{field.description}</p>}
                    </div>
                );
            case 'page_break':
                return <Separator className="my-10" key={field.id} />;
            case 'coordinator':
                const coordValue = formData[field.id] || { name: '', tel: '', email: '' };
                return (
                    <div key={field.id} className="space-y-6 text-left">
                        <Label className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <div className="space-y-2">
                                <Label htmlFor={`${field.id}_name`}>ชื่อ-นามสกุล</Label>
                                <Input id={`${field.id}_name`} name={`${field.id}_name`} required={field.required} value={coordValue.name} onChange={e => handleFieldChange(field.id, {...coordValue, name: e.target.value})} className="rounded-xl" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor={`${field.id}_tel`}>เบอร์โทรศัพท์ติดต่อ</Label>
                                <Input id={`${field.id}_tel`} name={`${field.id}_tel`} type="tel" required={field.required} value={coordValue.tel} onChange={e => handleFieldChange(field.id, {...coordValue, tel: e.target.value})} className="rounded-xl"/>
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`${field.id}_email`}>อีเมลสำหรับรับเอกสาร</Label>
                                <Input id={`${field.id}_email`} name={`${field.id}_email`} type="email" required={field.required} value={coordValue.email} onChange={e => handleFieldChange(field.id, {...coordValue, email: e.target.value})} className="rounded-xl" />
                            </div>
                        </div>
                    </div>
                );
            case 'company':
                // Only show company field if registration type is 'company'
                if (registrationType === 'individual') return null;
                
                return (
                     <div className="space-y-4 text-left" key={field.id}>
                        <Label htmlFor="clientCompanyName" className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <Input id="clientCompanyName" name="clientCompanyName" placeholder={field.placeholder || 'ระบุชื่อเต็มของบริษัทหรือหน่วยงาน...'} required={registrationType === 'company' && field.required} value={formData['clientCompanyName'] || ''} onChange={e => handleFieldChange('clientCompanyName', e.target.value)} className="rounded-xl h-12" />
                    </div>
                );
            case 'address':
                const addressValue = formData[field.id] || { isShippingSameAsBilling: true, billingAddress: {}, shippingAddress: {} };
                const isShippingSame = addressValue.isShippingSameAsBilling;

                const handleAddressChange = (type: 'billingAddress' | 'shippingAddress', key: string, value: string) => {
                  handleFieldChange(field.id, {
                    ...addressValue,
                    [type]: {
                      ...(addressValue[type] || {}),
                      [key]: value
                    }
                  });
                };

                return (
                    <div className="space-y-8 text-left" key={field.id}>
                        <Label className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        
                        <div className="space-y-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                             <Label className="font-bold text-slate-900 dark:text-slate-100">ที่อยู่ในการออกใบเสร็จ / ใบกำกับภาษี</Label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {addressFieldKeys.map(key => (
                                    <div className={`space-y-1.5 ${key.span}`} key={`${field.id}_billing_${key.name}`}>
                                        <Label htmlFor={`${field.id}_billing_${key.name}`} className="text-xs uppercase tracking-wider text-muted-foreground">{key.label}{field.required && key.required && <span className="text-destructive"> *</span>}</Label>
                                        <Input id={`${field.id}_billing_${key.name}`} name={`${field.id}_billing_${key.name}`} required={field.required && key.required} value={addressValue.billingAddress?.[key.name] || ''} onChange={e => handleAddressChange('billingAddress', key.name, e.target.value)} className="rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <Checkbox
                                id={`${field.id}_same_as_billing`}
                                name={`${field.id}_same_as_billing`}
                                checked={isShippingSame}
                                onCheckedChange={(checked) => handleFieldChange(field.id, { ...addressValue, isShippingSameAsBilling: !!checked })}
                            />
                            <Label htmlFor={`${field.id}_same_as_billing`} className="cursor-pointer font-medium">ที่อยู่จัดส่งเอกสาร/วุฒิบัตร เหมือนกับที่อยู่ใบเสร็จ</Label>
                        </div>

                        {!isShippingSame && (
                            <div className="space-y-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 animate-in fade-in-50 duration-500">
                                <Label className="font-bold text-slate-900 dark:text-slate-100">ที่อยู่สำหรับการจัดส่งเอกสาร</Label>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {addressFieldKeys.map(key => (
                                        <div className={`space-y-1.5 ${key.name === 'taxId' ? 'hidden' : key.span}`} key={`${field.id}_shipping_${key.name}`}>
                                            {key.name !== 'taxId' && (
                                                <>
                                                    <Label htmlFor={`${field.id}_shipping_${key.name}`} className="text-xs uppercase tracking-wider text-muted-foreground">{key.label}{field.required && key.required && <span className="text-destructive"> *</span>}</Label>
                                                    <Input id={`${field.id}_shipping_${key.name}`} name={`${field.id}_shipping_${key.name}`} required={field.required && key.required} value={addressValue.shippingAddress?.[key.name] || ''} onChange={e => handleAddressChange('shippingAddress', key.name, e.target.value)} className="rounded-xl" />
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
                return (
                     <div className="space-y-6 text-left" key={field.id}>
                         <Label className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                         <div className="space-y-6">
                            {attendees.map((attendee) => (
                               <AttendeeSubForm 
                                key={attendee.id} 
                                attendee={attendee}
                                subFields={field.subFields}
                                onRemove={removeAttendee} 
                                required={field.required}
                               />
                            ))}
                            <Button type="button" variant="outline" className="w-full h-16 border-dashed border-2 rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all group" onClick={addAttendee}>
                                <PlusCircle className="mr-2 h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> เพิ่มรายชื่อผู้เข้าอบรม
                            </Button>
                         </div>
                     </div>
                );
            case 'select':
                return (
                    <div className="space-y-4 text-left" key={field.id}>
                        <Label htmlFor={field.id} className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <input type="hidden" name={field.id} value={formData[field.id] || ''} />
                        <Select 
                            value={formData[field.id] || ''} 
                            onValueChange={(val) => handleFieldChange(field.id, val)}
                            required={field.required}
                        >
                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none">
                                <SelectValue placeholder={field.placeholder || "กรุณาเลือก..."} />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                                {(field.options || []).map(opt => (
                                    <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            case 'radio':
                return (
                    <div className="space-y-4 text-left" key={field.id}>
                        <Label htmlFor={field.id} className="text-xl font-bold flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <input type="hidden" name={field.id} value={formData[field.id] || ''} />
                        <RadioGroup 
                            value={formData[field.id] || ''} 
                            onValueChange={(val) => handleFieldChange(field.id, val)}
                            className="space-y-3 pl-2"
                            required={field.required}
                        >
                            {(field.options || []).map(opt => (
                                <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <RadioGroupItem value={opt.value} id={`${field.id}-${opt.id}`} />
                                    <Label htmlFor={`${field.id}-${opt.id}`} className="flex-1 cursor-pointer font-medium">{opt.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                );
            case 'textarea':
                return (
                    <div className="space-y-4 text-left" key={field.id}>
                        <Label htmlFor={field.id} className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <Textarea 
                            id={field.id} 
                            name={field.id} 
                            placeholder={field.placeholder} 
                            required={field.required} 
                            value={formData[field.id] || ''} 
                            onChange={e => handleFieldChange(field.id, e.target.value)} 
                            className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none min-h-[120px]" 
                        />
                    </div>
                );
            case 'text':
            case 'email':
            case 'tel':
                return (
                    <div className="space-y-4 text-left" key={field.id}>
                        <Label htmlFor={field.id} className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            {field.label}{field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        <Input 
                            id={field.id} 
                            name={field.id} 
                            type={field.type} 
                            placeholder={field.placeholder} 
                            required={field.required} 
                            value={formData[field.id] || ''} 
                            onChange={e => handleFieldChange(field.id, e.target.value)} 
                            className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900 border-none" 
                        />
                    </div>
                );
            default:
                return null;
        }
    };
    
    if (loading || isAutoFilling) {
        return (
            <Card className="rounded-[2.5rem] border-none shadow-2xl">
                <CardContent className="p-20 flex flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-6 text-muted-foreground font-light animate-pulse">กำลังเตรียมฟอร์มและข้อมูลของคุณครับ...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (state.success) {
        return (
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                <CardHeader className="items-center text-center p-12 bg-green-50 dark:bg-green-900/10">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
                        <CheckCircle className="h-12 w-12 text-white" />
                    </div>
                    <CardTitle className="text-4xl font-black mb-4">ลงทะเบียนสำเร็จ!</CardTitle>
                    <CardDescription className="text-lg font-light max-w-md">
                       เราได้รับข้อมูลการลงทะเบียนของคุณเรียบร้อยแล้วครับ ทีมงานจะตรวจสอบและติดต่อกลับโดยเร็วที่สุด
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center">
                    <div className="space-y-4">
                        {user ? (
                            <Button asChild className="w-full h-14 rounded-2xl text-lg font-bold">
                                <Link href="/training-history">
                                    <History className="mr-2 h-5 w-5" />
                                    ดูประวัติการอบรมของฉัน
                                </Link>
                            </Button>
                        ) : (
                            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 text-left space-y-3">
                                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                    <LogIn className="h-4 w-4" />
                                    สมัครบัญชีเพื่อติดตามสถานะการอบรม
                                </p>
                                <p className="text-xs text-muted-foreground font-light">เข้าสู่ระบบด้วย Google เพื่อดูสถานะการสมัครและประวัติการอบรมของคุณได้ตลอดเวลา</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full rounded-xl"
                                    onClick={async () => {
                                        const provider = new GoogleAuthProvider();
                                        try { await signInWithPopup(auth, provider); } catch {}
                                    }}
                                >
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                    เข้าสู่ระบบด้วย Google
                                </Button>
                            </div>
                        )}
                        <Button asChild variant="ghost" className="w-full h-12 rounded-2xl">
                            <Link href="/">กลับสู่หน้าแรก</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const guestUserPayload = JSON.stringify({ uid: null, email: null, displayName: null, isGuest: true });
    const userPayload = user ? JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName }) : guestUserPayload;

    return (
        <div className="space-y-4">
        {!user && (
            <div className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-primary/5 border border-primary/20">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                    <LogIn className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary mb-0.5">เข้าสู่ระบบเพื่อบันทึกประวัติการอบรม</p>
                    <p className="text-xs text-muted-foreground font-light">สมัครบัญชีฟรีด้วย Google เพื่อติดตามสถานะและดูประวัติการอบรมของคุณได้ตลอดเวลา</p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-xl text-xs font-bold"
                    onClick={async () => {
                        const provider = new GoogleAuthProvider();
                        try { await signInWithPopup(auth, provider); } catch {}
                    }}
                >
                    <svg className="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    เข้าสู่ระบบ
                </Button>
            </div>
        )}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
            <form action={formAction}>
                <input type="hidden" name="user" value={userPayload} />
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="formId" value={form.id} />
                <input type="hidden" name="attendeeIds" value={JSON.stringify(attendees.map(a => a.id))} />
                <input type="hidden" name="registrationType" value={registrationType} />
                <input type="hidden" name="fullFormData" value={JSON.stringify(formData)} />

                <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                                <Sparkles className="w-3.5 h-3.5" /> Registration Form
                            </div>
                            <CardTitle className="text-3xl md:text-4xl font-black font-headline">{form.name}</CardTitle>
                            {form.description && <CardDescription className="mt-4 text-lg font-light leading-relaxed">{form.description}</CardDescription>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    {/* Hardcoded Registration Type Selection */}
                    <div className="space-y-6 text-left">
                        <Label className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            ประเภทการสมัคร *
                        </Label>
                        <RadioGroup 
                            value={registrationType} 
                            onValueChange={(val: 'company' | 'individual') => setRegistrationType(val)}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <Label 
                                htmlFor="type-company" 
                                className={cn(
                                    "flex items-center gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900",
                                    registrationType === 'company' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800"
                                )}
                            >
                                <RadioGroupItem value="company" id="type-company" className="sr-only" />
                                <div className={cn("p-3 rounded-xl transition-colors", registrationType === 'company' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                                    <Building className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-lg">ในนามบริษัท / นิติบุคคล</p>
                                    <p className="text-xs text-muted-foreground font-light">สำหรับออกใบกำกับภาษีในนามบริษัท</p>
                                </div>
                            </Label>

                            <Label 
                                htmlFor="type-individual" 
                                className={cn(
                                    "flex items-center gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900",
                                    registrationType === 'individual' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800"
                                )}
                            >
                                <RadioGroupItem value="individual" id="type-individual" className="sr-only" />
                                <div className={cn("p-3 rounded-xl transition-colors", registrationType === 'individual' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                                    <User className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-lg">ในนามบุคคลทั่วไป</p>
                                    <p className="text-xs text-muted-foreground font-light">ใช้ชื่อบุคคลในการสมัครและออกใบเสร็จ</p>
                                </div>
                            </Label>
                        </RadioGroup>
                    </div>

                    <Separator className="opacity-50" />

                    {form.fields.map(renderField)}
                </CardContent>
                <CardFooter className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
        </div>
    );
}
