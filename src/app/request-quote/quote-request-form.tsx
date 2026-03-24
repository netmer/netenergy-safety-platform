'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import type { Course } from '@/lib/course-data';
import { requestQuoteAction, type QuoteFormState } from './actions';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Loader2, ArrowRight, CheckCircle, Building, User, Mail, Phone, FileText, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const initialState: QuoteFormState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          กำลังส่งข้อมูลคำขอ...
        </>
      ) : (
        <>
          ส่งคำขอรับใบเสนอราคา <ArrowRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}

export function QuoteRequestForm({ courses }: { courses: Course[] }) {
    const { user } = useAuth();
    const [state, formAction] = useActionState(requestQuoteAction, initialState);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const courseIdFromQuery = searchParams.get('courseId');

    useEffect(() => {
        if (state.message && !state.success) {
            toast({
                variant: "destructive",
                title: "ส่งข้อมูลไม่สำเร็จ",
                description: state.message,
            });
        }
    }, [state, toast]);

    if (state.success) {
        return (
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
             >
                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                    <CardHeader className="items-center text-center p-12 bg-green-50 dark:bg-green-900/10">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
                            <CheckCircle className="h-12 w-12 text-white" />
                        </div>
                        <CardTitle className="text-4xl font-black mb-4">ส่งคำขอสำเร็จ!</CardTitle>
                        <CardDescription className="text-lg font-light max-w-md mx-auto">
                           เราได้รับข้อมูลของท่านเรียบร้อยแล้ว ทีมงานฝ่ายขายจะรีบดำเนินการจัดทำใบเสนอราคาและส่งให้ท่านทางอีเมลโดยเร็วที่สุดครับ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-12 text-center space-y-6">
                        {state.quotationId && (
                             <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-mono text-sm inline-block">
                                <span className="text-muted-foreground mr-2">Reference ID:</span>
                                <span className="font-bold text-primary">{state.quotationId}</span>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button asChild className="h-12 px-8 rounded-xl font-bold" variant="default">
                                <Link href="/profile">ตรวจสอบสถานะที่โปรไฟล์</Link>
                            </Button>
                            <Button asChild className="h-12 px-8 rounded-xl font-bold" variant="outline">
                                <Link href="/courses">ดูหลักสูตรอื่นเพิ่มเติม</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    return (
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
            <form action={formAction}>
                <input type="hidden" name="userId" value={user?.uid || ''} />
                <CardHeader className="p-8 md:p-12 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-2xl flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <FileText className="w-6 h-6" />
                        </div>
                        แบบฟอร์มขอรับใบเสนอราคา
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                        กรุณาระบุรายละเอียดเบื้องต้นเพื่อให้ทีมงานฝ่ายขายจัดทำเอกสารให้ท่านได้อย่างแม่นยำครับ
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 md:p-12 space-y-10">
                    {/* SECTION 1: COURSE INFO */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-primary">1</div>
                            <h3 className="font-bold text-lg">เลือกหลักสูตรที่ต้องการ</h3>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="courseId">หลักสูตรที่สนใจอบรม *</Label>
                                <Select name="courseId" required defaultValue={courseIdFromQuery || undefined}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none">
                                        <SelectValue placeholder="กรุณาเลือกหลักสูตร..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[100]">
                                        <SelectGroup>
                                            <SelectLabel className="text-[10px] uppercase tracking-widest text-primary font-black px-2 py-1.5">รายการหลักสูตร</SelectLabel>
                                            {courses.map(course => (
                                                <SelectItem key={course.id} value={course.id} className="rounded-lg">{course.title}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="attendeeCount">จำนวนผู้เรียน (โดยประมาณ) *</Label>
                                <Input id="attendeeCount" name="attendeeCount" type="number" min="1" placeholder="ระบุจำนวนท่าน" required className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
                            </div>
                        </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* SECTION 2: COMPANY INFO */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-primary">2</div>
                            <h3 className="font-bold text-lg">ข้อมูลองค์กร</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="customerName" className="flex items-center gap-2"><Building className="w-3.5 h-3.5 opacity-50"/> ชื่อบริษัท / หน่วยงาน / องค์กร *</Label>
                                <Input id="customerName" name="customerName" placeholder="ชื่อที่ระบุในใบเสนอราคา..." required className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
                                <Input id="taxId" name="taxId" placeholder="13 หลัก (ถ้ามี)" className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="address">ที่อยู่สำหรับออกเอกสาร</Label>
                                <Textarea id="address" name="address" placeholder="เลขที่ตั้งสำนักงานสำหรับการออกใบเสนอราคา..." className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none min-h-[100px]" />
                            </div>
                        </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* SECTION 3: CONTACT INFO */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-primary">3</div>
                            <h3 className="font-bold text-lg">ข้อมูลการติดต่อผู้ประสานงาน</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label htmlFor="contactName" className="flex items-center gap-2"><User className="w-3.5 h-3.5 opacity-50"/> ชื่อ-นามสกุล ผู้ติดต่อ *</Label>
                                <Input id="contactName" name="contactName" required defaultValue={user?.displayName || ''} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactPhone" className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 opacity-50"/> เบอร์โทรศัพท์มือถือ *</Label>
                                <Input id="contactPhone" name="contactPhone" type="tel" required className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="contactEmail" className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 opacity-50"/> อีเมลสำหรับรับใบเสนอราคา *</Label>
                                <Input id="contactEmail" name="contactEmail" type="email" required defaultValue={user?.email || ''} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                        <Label htmlFor="notes" className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold mb-2">
                            <Sparkles className="w-4 h-4"/> รายละเอียดเพิ่มเติมหรือข้อซักถาม
                        </Label>
                        <Textarea id="notes" name="notes" placeholder="เช่น ขอใบเสนอราคาแยกรายบุคคล, ต้องการจัดอบรมนอกสถานที่จังหวัด..." className="rounded-xl bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-900 min-h-[80px]" />
                    </div>

                </CardContent>
                <CardFooter className="p-8 md:p-12 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}
