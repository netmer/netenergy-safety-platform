'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CheckCircle2, AlertCircle, FileText, UploadCloud, Trash2, Calendar, Phone, Mail, GraduationCap } from 'lucide-react';
import type { TrainingRecord, AttendeeData } from '@/lib/course-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditAttendeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: TrainingRecord | null;
    onSuccess: () => void;
}

export function validateThaiID(id: string) {
    if (!/^[0-9]{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(id.charAt(i)) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(id.charAt(12));
}

export function EditAttendeeModal({ isOpen, onClose, record, onSuccess }: EditAttendeeModalProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile Fields
    const [attendeeId, setAttendeeId] = useState('');
    const [attendeeName, setAttendeeName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [education, setEducation] = useState('');
    
    // Document Storage
    const [documents, setDocuments] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    // Auto-fill state
    const [isCheckingId, setIsCheckingId] = useState(false);
    const [foundExistingAttendee, setFoundExistingAttendee] = useState<AttendeeData | null>(null);

    useEffect(() => {
        if (record && isOpen) {
            setAttendeeId(record.attendeeId || '');
            setAttendeeName(record.attendeeName || '');
            setCompanyName(record.companyName || '');
            setPhoneNumber((record as any).phoneNumber || '');
            setEmailAddress((record as any).emailAddress || '');
            setDateOfBirth((record as any).dateOfBirth || '');
            setEducation((record as any).education || '');
            setDocuments((record as any).documents || []);
            setFoundExistingAttendee(null);
            setUploadProgress(null);
        }
    }, [record, isOpen]);

    useEffect(() => {
        if (attendeeId.length === 13 && validateThaiID(attendeeId) && firestore && attendeeId !== record?.attendeeId) {
            handleCheckExistingId(attendeeId);
        } else {
            setFoundExistingAttendee(null);
        }
    }, [attendeeId, firestore]);

    const handleCheckExistingId = async (id: string) => {
        if (!firestore) return;
        setIsCheckingId(true);
        try {
            const attendeeDocRef = doc(firestore, 'attendees', id);
            const attendeeSnap = await getDoc(attendeeDocRef);
            
            if (attendeeSnap.exists()) {
                setFoundExistingAttendee({ id: attendeeSnap.id, ...attendeeSnap.data() } as AttendeeData);
            } else {
                const recordsRef = collection(firestore, 'trainingRecords');
                const q = query(recordsRef, where('attendeeId', '==', id));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const firstMatch = snap.docs[0].data();
                    setFoundExistingAttendee({
                        id: id,
                        attendeeId: id,
                        fullName: firstMatch.attendeeName,
                        companyName: firstMatch.companyName,
                        phone: firstMatch.phoneNumber || '',
                        email: firstMatch.emailAddress || '',
                        dateOfBirth: firstMatch.dateOfBirth || '',
                        education: firstMatch.education || '',
                        documents: firstMatch.documents || []
                    } as any);
                }
            }
        } catch (error) {
            console.error("Error checking ID:", error);
        } finally {
            setIsCheckingId(false);
        }
    };

    const applyExistingData = () => {
        if (foundExistingAttendee) {
            if (foundExistingAttendee.fullName) setAttendeeName(foundExistingAttendee.fullName);
            if ((foundExistingAttendee as any).companyName) setCompanyName((foundExistingAttendee as any).companyName);
            if ((foundExistingAttendee as any).phone) setPhoneNumber((foundExistingAttendee as any).phone);
            if ((foundExistingAttendee as any).email) setEmailAddress((foundExistingAttendee as any).email);
            if (foundExistingAttendee.dateOfBirth) setDateOfBirth(foundExistingAttendee.dateOfBirth);
            if (foundExistingAttendee.education) setEducation(foundExistingAttendee.education);
            if (foundExistingAttendee.documents) {
                const existingDocs = foundExistingAttendee.documents.map(d => typeof d === 'string' ? d : d.url);
                setDocuments((prev) => [...new Set([...prev, ...existingDocs])]);
            }
            
            toast({
                title: 'โหลดข้อมูลเดิมสำเร็จ',
                description: 'ดึงข้อมูลประวัติย้อนหลังมาเติมลงในฟอร์มเรียบร้อยแล้ว',
            });
            setFoundExistingAttendee(null);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const storage = getStorage();
            if (!storage) throw new Error("Storage not initialized");

            const fileRef = ref(storage, `attendee_documents/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }, 
                (error) => {
                    console.error("Upload error:", error);
                    toast({ variant: 'destructive', title: 'อัปโหลดล้มเหลว', description: error.message });
                    setUploadProgress(null);
                }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setDocuments(prev => [...prev, downloadURL]);
                    setUploadProgress(null);
                    toast({ title: 'อัปโหลดสำเร็จ', description: 'แนบไฟล์เอกสารเรียบร้อยแล้ว' });
                }
            );
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Storage', description: error.message });
        }
    };

    const removeDocument = (index: number) => {
        const newDocs = [...documents];
        newDocs.splice(index, 1);
        setDocuments(newDocs);
    };

    const handleSave = async () => {
        if (!firestore || !record) return;
        if (attendeeId && !validateThaiID(attendeeId)) {
            toast({ variant: 'destructive', title: 'เลขบัตรประชาชนไม่ถูกต้อง', description: 'กรุณากรอกรหัสประจำตัว 13 หลักให้ถูกต้องตามหลัก Check Digit' });
            return;
        }

        startTransition(async () => {
            try {
                const recordRef = doc(firestore, 'trainingRecords', record.id);
                const updates = {
                    attendeeId: attendeeId || null,
                    attendeeName,
                    companyName,
                    phoneNumber,
                    emailAddress,
                    dateOfBirth,
                    education,
                    documents
                };
                await updateDocumentNonBlocking(recordRef, updates);

                if (attendeeId && validateThaiID(attendeeId)) {
                    const attendeeRef = doc(firestore, 'attendees', attendeeId);
                    await setDoc(attendeeRef, {
                        attendeeId: attendeeId,
                        fullName: attendeeName,
                        phone: phoneNumber,
                        email: emailAddress,
                        dateOfBirth,
                        education,
                        documents
                    }, { merge: true });
                }

                toast({ title: 'บันทึกสำเร็จ', description: 'อัปเดตประวัติผู้เข้าอบรม 360° เรียบร้อยแล้ว' });
                onSuccess();
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) { onClose(); setUploadProgress(null); }
        }}>
            <DialogContent className="sm:max-w-[650px] rounded-3xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col max-h-[90vh]">
                <div className="bg-white dark:bg-slate-900 border-b px-6 py-5">
                    <DialogTitle className="text-2xl font-bold font-headline">ข้อมูลประวัติผู้อบรม (360° Profile)</DialogTitle>
                    <DialogDescription className="mt-1">ตรวจสอบความถูกและอัปเดตข้อมูลผู้เรียนให้เป็นปัจจุบัน</DialogDescription>
                </div>

                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="info" className="w-full flex flex-col h-full">
                        <div className="px-6 pt-4 bg-white dark:bg-slate-900">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <TabsTrigger value="info" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">ข้อมูลส่วนตัว</TabsTrigger>
                                <TabsTrigger value="contact" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">การติดต่อ</TabsTrigger>
                                <TabsTrigger value="docs" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                                    เอกสาร <BadgeCount count={documents.length} />
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <ScrollArea className="flex-1 h-full max-h-[450px]">
                            <div className="p-6">
                                {/* -- TAB: INFO -- */}
                                <TabsContent value="info" className="m-0 space-y-5 focus-visible:outline-none focus-visible:ring-0">
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">เลขบัตรประจำตัวประชาชน</Label>
                                        <div className="relative">
                                            <Input 
                                                value={attendeeId}
                                                onChange={e => setAttendeeId(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                                                placeholder="เลข 13 หลัก"
                                                className={cn("h-12 rounded-xl font-mono text-base shadow-sm bg-white", attendeeId.length === 13 ? (validateThaiID(attendeeId) ? 'border-emerald-500 bg-emerald-50/50 focus-visible:ring-emerald-500' : 'border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500') : '')}
                                            />
                                            <div className="absolute right-4 top-3.5">
                                                {isCheckingId ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> :
                                                attendeeId.length === 13 ? (
                                                    validateThaiID(attendeeId) ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />
                                                ) : <Search className="w-5 h-5 text-slate-300" />}
                                            </div>
                                        </div>
                                        {attendeeId.length === 13 && !validateThaiID(attendeeId) && <p className="text-[11px] text-rose-500 font-bold mt-1">รูปแบบรหัส 13 หลักไม่ถูกต้อง (Check Digit Failed)</p>}
                                    </div>

                                    {foundExistingAttendee && (
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div className="flex-1 pt-0.5">
                                                <h4 className="text-sm font-bold text-amber-900">พบข้อมูลประวัติเดิมในระบบ Cloud</h4>
                                                <div className="text-xs text-amber-700 mt-1.5 space-y-0.5">
                                                    <p>ชื่อ: <span className="font-semibold">{foundExistingAttendee.fullName}</span></p>
                                                    {(foundExistingAttendee as any).companyName && <p>สังกัด: <span className="font-semibold">{(foundExistingAttendee as any).companyName}</span></p>}
                                                    {foundExistingAttendee.education && <p>วุฒิ: <span className="font-semibold">{foundExistingAttendee.education}</span></p>}
                                                </div>
                                                <Button size="sm" onClick={applyExistingData} className="mt-3 w-full bg-amber-500 hover:bg-amber-600 shadow-sm text-amber-50 font-bold rounded-lg h-9">
                                                    สวมทับฟอร์มด้วยข้อมูลเดิม
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">ชื่อ-นามสกุล ผู้อบรม</Label>
                                            <Input value={attendeeName} onChange={e => setAttendeeName(e.target.value)} className="h-11 rounded-xl shadow-sm bg-white" placeholder="เช่น นายสมปอง รักงาน" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> วัน/เดือน/ปีเกิด</Label>
                                            <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="h-11 rounded-xl shadow-sm bg-white text-slate-600" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5"/> วุฒิการศึกษา</Label>
                                        <Input value={education} onChange={e => setEducation(e.target.value)} className="h-11 rounded-xl shadow-sm bg-white" placeholder="เช่น ปริญญาตรี อุตสาหการ" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">หน่วยงาน / สังกัดอ้างอิง</Label>
                                        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-11 rounded-xl shadow-sm bg-white" placeholder="ชื่อบริษัท..." />
                                    </div>
                                </TabsContent>

                                {/* -- TAB: CONTACT -- */}
                                <TabsContent value="contact" className="m-0 space-y-5 focus-visible:outline-none focus-visible:ring-0">
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> เบอร์โทรศัพท์มือถือ</Label>
                                        <Input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0,10))} className="h-11 rounded-xl shadow-sm bg-white font-mono text-base" placeholder="08XXXXXXXX" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> อีเมลติดต่อส่วนตัวพนักงาน</Label>
                                        <Input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} className="h-11 rounded-xl shadow-sm bg-white" placeholder="example@gmail.com" />
                                        <p className="text-[10px] text-muted-foreground mt-1">ใช้สำหรับการส่ง E-Certificate แบบอัตโนมัติเมื่ออบรมผ่าน</p>
                                    </div>
                                </TabsContent>

                                {/* -- TAB: DOCS -- */}
                                <TabsContent value="docs" className="m-0 space-y-5 focus-visible:outline-none focus-visible:ring-0">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-50",
                                            uploadProgress !== null ? "border-slate-200 bg-slate-50 pointer-events-none" : "border-indigo-200 hover:border-indigo-400 bg-indigo-50/20"
                                        )}
                                    >
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                                        
                                        {uploadProgress !== null ? (
                                            <div className="w-full max-w-xs space-y-3">
                                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                                <p className="text-sm font-bold text-slate-600">กำลังอัปโหลด... {Math.round(uploadProgress)}%</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 shadow-sm">
                                                    <UploadCloud className="w-7 h-7" />
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm">อัปโหลดไฟล์เอกสารส่วนตัว</h4>
                                                <p className="text-xs text-slate-500 mt-1">คลิกที่นี่ หรือ ลากไฟล์ทรานสคริปต์/บัตรประชาชน มาวาง</p>
                                                <p className="text-[10px] text-slate-400 mt-2 font-mono">รองรับ JPG, PNG, PDF ขนาดไม่เกิน 5MB</p>
                                            </>
                                        )}
                                    </div>

                                    {documents.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">เอกสารที่แนบไว้ในแฟ้ม ({documents.length})</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {documents.map((url, i) => (
                                                    <div key={i} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 shrink-0">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-slate-700 truncate">Document_0{i+1}.{url.includes('pdf')?'pdf':'jpg'}</p>
                                                            <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline font-bold mt-0.5 block">คลิกดูไฟล์เต็ม</a>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => removeDocument(i)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>

                <div className="bg-white dark:bg-slate-900 border-t px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end items-center">
                    <Button variant="ghost" className="rounded-xl h-11 w-full sm:w-auto font-bold text-slate-500 hover:bg-slate-100" onClick={onClose} disabled={isPending || uploadProgress !== null}>ยกเลิก</Button>
                    <Button onClick={handleSave} disabled={isPending || uploadProgress !== null || (attendeeId.length > 0 && !validateThaiID(attendeeId))} className="rounded-xl h-11 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold min-w-[120px] shadow-md">
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />}
                        บันทึกประวัติทั้งหมด
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const BadgeCount = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
        <span className="bg-indigo-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full ml-1 leading-none -mt-0.5">{count}</span>
    );
}
