'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CheckCircle2, AlertCircle, UserPlus, Building, Phone, Mail } from 'lucide-react';
import { validateThaiID } from '@/lib/attendee-utils';
import type { TrainingSchedule } from '@/lib/course-data';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface AddWalkinAttendeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: TrainingSchedule | null;
    onSuccess: () => void;
}

export function AddWalkinAttendeeModal({ isOpen, onClose, schedule, onSuccess }: AddWalkinAttendeeModalProps) {
    const firestore = useFirestore();
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [attendeeId, setAttendeeId] = useState('');
    const [attendeeName, setAttendeeName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [emailAddress, setEmailAddress] = useState('');

    const [isCheckingId, setIsCheckingId] = useState(false);
    const [autoFilled, setAutoFilled] = useState(false);

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setAttendeeId('');
            setAttendeeName('');
            setCompanyName('');
            setPhoneNumber('');
            setEmailAddress('');
            setAutoFilled(false);
        }
    }, [isOpen]);

    // Auto-fill from master attendees DB when a valid national ID is entered
    useEffect(() => {
        const tryAutoFill = async () => {
            if (attendeeId.length === 13 && validateThaiID(attendeeId) && firestore) {
                setIsCheckingId(true);
                setAutoFilled(false);
                try {
                    const snap = await getDoc(doc(firestore, 'attendees', attendeeId));
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.fullName) setAttendeeName(data.fullName);
                        if (data.companyName) setCompanyName(data.companyName);
                        if (data.phone) setPhoneNumber(data.phone);
                        if (data.email) setEmailAddress(data.email);
                        setAutoFilled(true);
                        toast({ title: 'พบข้อมูลในระบบ', description: `โหลดประวัติของ ${data.fullName} อัตโนมัติ` });
                    }
                } catch (e) {
                    console.error('Auto-fill error:', e);
                } finally {
                    setIsCheckingId(false);
                }
            } else {
                setAutoFilled(false);
            }
        };
        tryAutoFill();
    }, [attendeeId, firestore]);

    const handleAdd = () => {
        if (!firestore || !schedule) return;
        if (!attendeeName.trim()) {
            toast({ variant: 'destructive', title: 'กรุณากรอกชื่อ-นามสกุล', description: 'ชื่อผู้อบรม Walk-in จำเป็นต้องกรอก' });
            return;
        }
        if (attendeeId && !validateThaiID(attendeeId)) {
            toast({ variant: 'destructive', title: 'เลขบัตรไม่ถูกต้อง', description: 'กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง' });
            return;
        }

        startTransition(async () => {
            try {
                // Create trainingRecord directly
                const recordData = {
                    attendeeId: attendeeId || null,
                    attendeeName: attendeeName.trim(),
                    companyName: companyName.trim() || 'Walk-in',
                    phoneNumber: phoneNumber.trim(),
                    emailAddress: emailAddress.trim(),
                    scheduleId: schedule.id,
                    courseId: schedule.courseId,
                    courseTitle: schedule.courseTitle,
                    registrationId: `WALKIN-${Date.now()}`,
                    registrationAttendeeId: `WALKIN-${Date.now()}`,
                    status: 'docs_verified',
                    attendance: 'present',
                    completionDate: schedule.endDate || schedule.startDate,
                    preTestScore: '',
                    postTestScore: '',
                    isWalkIn: true,
                    createdAt: new Date().toISOString(),
                    createdBy: profile?.displayName || profile?.email || 'Admin',
                };

                await addDoc(collection(firestore, 'trainingRecords'), recordData);

                // Update master attendee DB if has national ID
                if (attendeeId && validateThaiID(attendeeId)) {
                    const { setDoc } = await import('firebase/firestore');
                    await setDoc(doc(firestore, 'attendees', attendeeId), {
                        attendeeId,
                        fullName: attendeeName.trim(),
                        companyName: companyName.trim(),
                        phone: phoneNumber.trim(),
                        email: emailAddress.trim(),
                    }, { merge: true });
                }

                // Log history
                try {
                    await addDoc(collection(firestore, `trainingSchedules/${schedule.id}/history`), {
                        action: 'เพิ่มผู้อบรม Walk-in',
                        detail: `เพิ่ม [${attendeeName.trim()}] (${companyName || 'Walk-in'}) เข้าคลาสแบบ Walk-in`,
                        performedBy: profile?.displayName || profile?.email || 'Unknown',
                        timestamp: new Date().toISOString(),
                    });
                } catch (_) {}

                toast({ title: 'เพิ่มผู้อบรม Walk-in สำเร็จ', description: `${attendeeName.trim()} เข้าร่วมคลาสแล้ว` });
                onSuccess();
                onClose();
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    const idValid = attendeeId.length === 0 || (attendeeId.length === 13 && validateThaiID(attendeeId));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-7 py-6 text-white">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white">เพิ่มผู้อบรม Walk-in</DialogTitle>
                    </div>
                    <DialogDescription className="text-violet-100 text-sm mt-1">
                        เพิ่มผู้เข้าอบรมที่มาแบบ Walk-in โดยตรงในคลาส: <span className="font-bold text-white">{schedule?.courseTitle}</span>
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-5">
                    {/* National ID */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">เลขบัตรประจำตัวประชาชน (ถ้ามี)</Label>
                        <div className="relative">
                            <Input
                                value={attendeeId}
                                onChange={e => setAttendeeId(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                                placeholder="กรอกเลข 13 หลักเพื่อโหลดข้อมูลอัตโนมัติ"
                                className={cn(
                                    "h-12 rounded-xl font-mono text-base shadow-sm bg-white pr-12",
                                    attendeeId.length === 13
                                        ? (validateThaiID(attendeeId) ? 'border-emerald-500 bg-emerald-50/50' : 'border-rose-500 bg-rose-50/50')
                                        : ''
                                )}
                            />
                            <div className="absolute right-4 top-3.5">
                                {isCheckingId ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> :
                                    attendeeId.length === 13 ? (
                                        validateThaiID(attendeeId)
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            : <AlertCircle className="w-5 h-5 text-rose-500" />
                                    ) : <Search className="w-5 h-5 text-slate-300" />}
                            </div>
                        </div>
                        {autoFilled && (
                            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> โหลดข้อมูลจากระบบอัตโนมัติ
                            </p>
                        )}
                        {attendeeId.length === 13 && !validateThaiID(attendeeId) && (
                            <p className="text-[11px] text-rose-500 font-bold">รูปแบบรหัส 13 หลักไม่ถูกต้อง (Check Digit Failed)</p>
                        )}
                    </div>

                    {/* Name - Required */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            value={attendeeName}
                            onChange={e => setAttendeeName(e.target.value)}
                            placeholder="เช่น นายสมชาย รักงาน"
                            className="h-12 rounded-xl shadow-sm bg-white font-semibold"
                        />
                    </div>

                    {/* Company */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5" /> หน่วยงาน / บริษัท
                        </Label>
                        <Input
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="ชื่อบริษัท (ไม่บังคับ)"
                            className="h-11 rounded-xl shadow-sm bg-white"
                        />
                    </div>

                    {/* Phone & Email row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Phone className="w-3 h-3" /> โทรศัพท์
                            </Label>
                            <Input
                                type="tel"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                placeholder="08XXXXXXXX"
                                className="h-10 rounded-xl shadow-sm bg-white font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Mail className="w-3 h-3" /> อีเมล
                            </Label>
                            <Input
                                type="email"
                                value={emailAddress}
                                onChange={e => setEmailAddress(e.target.value)}
                                placeholder="example@email.com"
                                className="h-10 rounded-xl shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Info note */}
                    <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-violet-700 leading-relaxed">
                        <strong className="font-bold">หมายเหตุ:</strong> ผู้อบรม Walk-in จะถูกเพิ่มเข้าสู่คลาสนี้ทันทีด้วยสถานะ <strong>"เอกสารครบถ้วน"</strong> และ <strong>"มาเรียน"</strong> และจะปรากฏในตารางด้านล่างพร้อมป้าย Walk-in
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border-t px-6 py-4 flex gap-3 justify-end">
                    <Button variant="ghost" className="rounded-xl h-11 font-bold text-slate-500 hover:bg-slate-100" onClick={onClose} disabled={isPending}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={isPending || !attendeeName.trim() || !idValid}
                        className="rounded-xl h-11 font-bold min-w-[160px] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                        เพิ่มเขาในคลาสนี้
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
