'use client';

import { useAuth } from '@/context/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { Registration, TrainingRecord, RegistrationAttendee } from '@/lib/course-data';

import { AdminLogin } from '@/components/auth/admin-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Loader2, User, History, CheckCircle, Clock,
    XCircle, ArrowRight, ShieldCheck, Building, Award,
    FileText, LayoutDashboard, Download, Eye, GraduationCap, Mail,
    Calendar, AlertTriangle, ShieldX, Infinity, Users, Briefcase, PlusCircle, MessageSquare,
    ExternalLink, ClipboardList, UserCheck, UserX, CalendarClock
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Image from 'next/image';

const registrationStatusConfig: Record<Registration['status'], { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: 'รอตรวจสอบ', className: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    confirmed: { label: 'ยืนยันแล้ว', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export function ProfileClientPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const firestore = useFirestore();

    // Real-time Registrations for this user
    const regQuery = useMemoFirebase(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'registrations'), 
            where('userId', '==', user.uid), 
            orderBy('registrationDate', 'desc')
        );
    }, [user?.uid, firestore]);
    
    const { data: registrationsRaw, isLoading: regLoading } = useCollection<Registration>(regQuery);
    const registrations = registrationsRaw ?? [];

    // Real-time Training Records linked to those registrations
    const regIds = useMemo(() => registrations?.map(r => r.id).slice(0, 30) || [], [registrations]);
    
    const recordsQuery = useMemoFirebase(() => {
        if (regIds.length === 0 || !firestore) return null;
        return query(
            collection(firestore, 'trainingRecords'),
            where('registrationId', 'in', regIds)
        );
    }, [regIds, firestore]);

    const { data: teamRecordsRaw, isLoading: recordsLoading } = useCollection<TrainingRecord>(recordsQuery);
    const teamRecords = teamRecordsRaw ?? [];
    
    const stats = useMemo(() => {
        const uniqueAttendees = new Set(teamRecords?.map(r => r.attendeeName)).size;
        const totalCompleted = teamRecords?.filter(r => r.status === 'completed').length;
        
        return {
            totalApplications: registrations?.length || 0,
            managedTeamSize: uniqueAttendees,
            certificatesEarned: totalCompleted,
        };
    }, [registrations, teamRecords]);

    if (authLoading || regLoading) {
        return (
            <div className="flex flex-col justify-center items-center py-32">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-light">กำลังเชื่อมต่อข้อมูล Real-time ของคุณ...</p>
            </div>
        );
    }

    if (!user) {
        return <AdminLogin />;
    }

    const companyName = registrations?.[0]?.clientCompanyName || 'ผู้ประสานงานทั่วไป';
    
    return (
        <div className="py-10 max-w-6xl mx-auto space-y-8 px-4 sm:px-6">
            {/* --- Coordinator Header --- */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-[2rem] bg-slate-950 text-white p-8 md:p-10 overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-10">
                    <div className="relative shrink-0">
                        <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-white/5 shadow-2xl rounded-3xl">
                            <AvatarImage src={user.photoURL ?? ''} className="object-cover" />
                            <AvatarFallback className="bg-primary/20 text-3xl">
                                <User className="h-12 w-12" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl border-4 border-slate-950 shadow-lg">
                            <Briefcase className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    
                    <div className="text-center md:text-left space-y-3 flex-grow min-w-0">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                                <Badge className="bg-primary/20 text-primary border-none font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                                    Registration Coordinator
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{user.displayName}</h1>
                            <p className="text-slate-400 text-base md:text-lg font-light flex items-center justify-center md:justify-start gap-2">
                                <Building className="w-4 h-4 text-primary/70" /> {companyName}
                            </p>
                        </div>
                        
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-500 font-medium">
                            <Mail className="w-3.5 h-3.5" /> {user.email}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                        {[
                            { label: 'ใบสมัคร', value: stats.totalApplications, icon: FileText },
                            { label: 'ดูแลทีม', value: stats.managedTeamSize, icon: Users },
                            { label: 'วุฒิบัตร', value: stats.certificatesEarned, icon: Award },
                        ].map((stat, i) => (
                            <div key={`stat-${i}`} className="bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center min-w-[85px] backdrop-blur-sm">
                                <stat.icon className="w-4 h-4 text-primary/60 mb-1.5" />
                                <span className="text-xl md:text-2xl font-bold">{stat.value}</span>
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-center">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900 border mb-8">
                    <TabsTrigger value="overview" className="rounded-xl font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-800">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> ภาพรวม
                    </TabsTrigger>
                    <TabsTrigger value="registrations" className="rounded-xl font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-800">
                        <History className="w-4 h-4 mr-2" /> การลงทะเบียน
                    </TabsTrigger>
                    <TabsTrigger value="certificates" className="rounded-xl font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-800">
                        <Award className="w-4 h-4 mr-2" /> วุฒิบัตรทีม
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-400 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 rounded-[1.5rem] border-none shadow-lg bg-white dark:bg-slate-900">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <PlusCircle className="w-4 h-4" />
                                    </div>
                                    จัดการงานด่วน
                                </CardTitle>
                                <CardDescription className="text-sm">เข้าถึงบริการที่ผู้ประสานงานต้องใช้บ่อยได้อย่างรวดเร็ว</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button asChild className="h-14 rounded-xl font-bold shadow-md hover:scale-[1.01] transition-all" variant="default">
                                    <Link href="/courses">
                                        <GraduationCap className="mr-2 h-5 w-5" /> สมัครอบรมใหม่
                                    </Link>
                                </Button>
                                <Button asChild className="h-14 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all" variant="outline">
                                    <Link href="/request-quote">
                                        <FileText className="mr-2 h-5 w-5" /> ขอใบเสนอราคา In-house
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[1.5rem] border-none shadow-lg bg-primary text-white overflow-hidden p-1 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <MessageSquare size={100} />
                            </div>
                            <CardHeader className="relative z-10">
                                <CardTitle className="text-lg">ฝ่ายดูแลองค์กร</CardTitle>
                                <CardDescription className="text-primary-foreground/70 text-xs">สอบถามเรื่องเอกสาร หรือปรับปรุงรายการสมัคร</CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10 pt-2">
                                <Button variant="secondary" size="sm" className="w-full rounded-lg h-10 font-bold mb-2.5 shadow-md" asChild>
                                    <Link href="/contact">คุยกับเจ้าหน้าที่</Link>
                                </Button>
                                <div className="text-center text-[10px] font-bold uppercase tracking-widest opacity-80">Call: 0-2582-2111</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold pl-1 flex items-center gap-2">
                            <History className="w-4 h-4 text-primary" /> กิจกรรมล่าสุด
                        </h3>
                        {registrations.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed rounded-3xl bg-slate-50 dark:bg-slate-900/20">
                                <p className="text-muted-foreground font-light text-sm">ท่านยังไม่มีรายการกิจกรรมในประวัติ</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {registrations.slice(0, 3).map(reg => (
                                    <div key={`recent-${reg.id}`} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-primary shrink-0">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">{reg.courseTitle}</p>
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1 font-medium">
                                                <Building className="w-3 h-3" /> {reg.clientCompanyName || 'N/A'} • 
                                                <Users className="w-3 h-3" /> {Object.values(reg.formData).find(v => Array.isArray(v))?.length || 0} คน
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <StatusBadge status={reg.status} />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                                                <Link href={`/courses/course/${reg.courseId}`}><ArrowRight className="w-4 h-4"/></Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="registrations" className="space-y-5 animate-in fade-in slide-in-from-bottom-1 duration-400 focus-visible:outline-none">
                    {registrations.length > 0 ? (
                        <div className="grid gap-5">
                            {registrations.map(reg => (
                                <RegistrationCard key={`reg-${reg.id}`} reg={reg} />
                            ))}
                        </div>
                    ) : <EmptyState message="ยังไม่พบรายการส่งสมัครในประวัติของคุณ" actionLink="/courses" actionText="สำรวจหลักสูตรและสมัครอบรม" />}
                </TabsContent>

                <TabsContent value="certificates" className="space-y-5 animate-in fade-in slide-in-from-bottom-1 duration-400 focus-visible:outline-none">
                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex flex-col sm:flex-row items-center gap-4 mb-4">
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                            <Award className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="font-bold text-amber-900 dark:text-amber-100 text-base">คลังวุฒิบัตรพนักงานในกำกับ</h4>
                            <p className="text-amber-700/70 dark:text-amber-400/70 text-xs font-medium">คุณสามารถดาวน์โหลดใบประกาศของพนักงานทุกคนที่คุณเป็นผู้ประสานงานให้ได้ที่นี่ครับ</p>
                        </div>
                    </div>
                    
                    {teamRecords.filter(r => r.status === 'completed').length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teamRecords.filter(r => r.status === 'completed').map(cert => (
                                <CertificateCard key={`cert-${cert.id}`} cert={cert} />
                            ))}
                        </div>
                    ) : <EmptyState message="ยังไม่พบวุฒิบัตรที่อนุมัติแล้วในทีมของคุณ" actionLink="/" actionText="ตรวจสอบสถานะพนักงาน" />}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatusBadge({ status }: { status: Registration['status'] }) {
    const config = registrationStatusConfig[status] || { label: status, className: 'bg-gray-100', icon: Clock };
    return (
        <Badge variant="outline" className={cn('gap-x-1 px-2.5 py-0.5 rounded-full font-bold border-none shadow-sm text-[10px] uppercase tracking-wide', config.className)}>
            <config.icon className="h-3 w-3" />
            <span>{config.label}</span>
        </Badge>
    );
}

const attendeeStatusConfig = {
    pending:   { label: 'รออนุมัติ',  icon: CalendarClock, cls: 'bg-amber-100 text-amber-800' },
    confirmed: { label: 'ยืนยันแล้ว', icon: UserCheck,     cls: 'bg-green-100 text-green-800' },
    postponed: { label: 'เลื่อนรอบ',  icon: Clock,          cls: 'bg-blue-100 text-blue-800'  },
    cancelled: { label: 'ยกเลิก',     icon: UserX,          cls: 'bg-red-100 text-red-800'    },
} as const;

function RegistrationCard({ reg }: { reg: Registration }) {
    const [open, setOpen] = useState(false);

    const attendeeListField = reg.formSchema.find(f => f.type === 'attendee_list');
    const attendees: RegistrationAttendee[] = attendeeListField
        ? (reg.formData[attendeeListField.id] || []) as RegistrationAttendee[]
        : [];
    const fullNameSubField = attendeeListField?.subFields?.find(sf => sf.label.includes('ชื่อ-นามสกุล'));

    const otherFields = reg.formSchema.filter(f =>
        f.type !== 'attendee_list' && f.type !== 'header' && f.type !== 'page_break'
    );

    return (
        <>
            <Card className="rounded-2xl border-none shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row">
                    <div className="p-6 md:p-8 flex-grow space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <StatusBadge status={reg.status} />
                                <Badge variant="secondary" className="rounded-full bg-slate-50 dark:bg-slate-800 border-none font-bold text-[10px]">
                                    <Users className="w-3 h-3 mr-1" /> {attendees.length} คน
                                </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary/60" />
                                {format(new Date(reg.registrationDate), 'd MMM yyyy', { locale: th })}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{reg.courseTitle}</h3>
                            <p className="text-slate-500 mt-1.5 text-sm font-medium flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 opacity-40" /> {reg.clientCompanyName || 'ข้อมูลส่วนบุคคล'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 md:w-56 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 gap-3">
                        <Button variant="default" size="sm" className="w-full rounded-lg font-bold shadow-sm" onClick={() => setOpen(true)}>
                            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> ดูรายละเอียด
                        </Button>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center mt-1">
                            ID: {reg.id.slice(0, 8)}
                        </div>
                    </div>
                </div>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <DialogTitle className="text-xl font-bold leading-tight">{reg.courseTitle}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                                    <Building className="w-3.5 h-3.5" /> {reg.clientCompanyName || 'ข้อมูลส่วนบุคคล'}
                                </p>
                            </div>
                            <StatusBadge status={reg.status} />
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> ลงทะเบียน: {format(new Date(reg.registrationDate), 'd MMM yyyy', { locale: th })}</span>
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> ID: {reg.id.slice(0, 12)}</span>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-6 space-y-6">

                            {/* Attendees */}
                            {attendees.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <Users className="w-4 h-4 text-primary" /> รายชื่อผู้เข้าอบรม ({attendees.length} คน)
                                    </h4>
                                    <div className="border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/20">
                                                <tr>
                                                    <th className="text-left p-2.5 font-semibold text-xs">#</th>
                                                    <th className="text-left p-2.5 font-semibold text-xs">ชื่อ-นามสกุล</th>
                                                    <th className="text-left p-2.5 font-semibold text-xs">สถานะ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {attendees.map((a, i) => {
                                                    const cfg = attendeeStatusConfig[a.status] || attendeeStatusConfig.pending;
                                                    const Icon = cfg.icon;
                                                    const name = fullNameSubField ? (a[fullNameSubField.id] as string) : (a.fullName || 'ผู้อบรม');
                                                    return (
                                                        <tr key={a.id} className="hover:bg-muted/5">
                                                            <td className="p-2.5 text-muted-foreground text-xs">{i + 1}</td>
                                                            <td className="p-2.5 font-medium">{name}</td>
                                                            <td className="p-2.5">
                                                                <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.cls)}>
                                                                    <Icon className="w-3 h-3" />{cfg.label}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Other form fields */}
                            {otherFields.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <ClipboardList className="w-4 h-4 text-primary" /> ข้อมูลการลงทะเบียน
                                    </h4>
                                    <div className="space-y-2">
                                        {otherFields.map(field => {
                                            const value = reg.formData[field.id];
                                            if (!value || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) return null;
                                            if (field.type === 'coordinator') {
                                                const c = value as any;
                                                return (
                                                    <div key={field.id} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                                                        <span className="text-muted-foreground text-xs font-semibold">{field.label}</span>
                                                        <span className="font-medium text-right text-xs">{c.name || ''} {c.tel ? `• ${c.tel}` : ''} {c.email ? `• ${c.email}` : ''}</span>
                                                    </div>
                                                );
                                            }
                                            if (field.type === 'address') {
                                                const b = (value as any).billingAddress || {};
                                                return (
                                                    <div key={field.id} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                                                        <span className="text-muted-foreground text-xs font-semibold">{field.label}</span>
                                                        <span className="font-medium text-right text-xs max-w-[60%]">{[b.address1, b.subdistrict, b.district, b.province, b.postalCode].filter(Boolean).join(' ')}</span>
                                                    </div>
                                                );
                                            }
                                            if (typeof value === 'string' || typeof value === 'number') {
                                                return (
                                                    <div key={field.id} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                                                        <span className="text-muted-foreground text-xs font-semibold">{field.label}</span>
                                                        <span className="font-medium text-right text-xs max-w-[60%]">{String(value)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Documents */}
                            {(reg.quotationGenerated || reg.invoiceGenerated || reg.receiptGenerated) && (
                                <div>
                                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <FileText className="w-4 h-4 text-primary" /> เอกสาร
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {reg.quotationUrl && <a href={reg.quotationUrl} target="_blank" rel="noreferrer"><Badge variant="outline" className="gap-1 cursor-pointer hover:bg-blue-50"><ExternalLink className="w-3 h-3" /> ใบเสนอราคา</Badge></a>}
                                        {reg.invoiceUrl && <a href={reg.invoiceUrl} target="_blank" rel="noreferrer"><Badge variant="outline" className="gap-1 cursor-pointer hover:bg-green-50"><ExternalLink className="w-3 h-3" /> ใบแจ้งหนี้</Badge></a>}
                                        {reg.receiptUrl && <a href={reg.receiptUrl} target="_blank" rel="noreferrer"><Badge variant="outline" className="gap-1 cursor-pointer hover:bg-purple-50"><ExternalLink className="w-3 h-3" /> ใบเสร็จ</Badge></a>}
                                    </div>
                                </div>
                            )}

                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CertificateCard({ cert }: { cert: TrainingRecord }) {
    const status = getCertificateStatus(cert.expiryDate);

    return (
        <Card className="rounded-2xl border-none shadow-md hover:shadow-lg transition-all duration-500 group bg-white dark:bg-slate-900 overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="aspect-[1.414/1] relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/certificate-templates%2Fdefault-template.jpg?alt=media&token=c1e309a9-4562-42c2-9010-0937c569a9b7"
                    alt={cert.courseTitle}
                    fill
                    className="object-cover opacity-15 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                    <Award className="w-10 h-10 text-primary mb-2.5 opacity-80" />
                    <h4 className="font-bold text-xs leading-tight line-clamp-2 mb-1 px-4">{cert.courseTitle}</h4>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">{cert.attendeeName}</p>
                </div>
                <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] p-4">
                    <Button asChild className="rounded-lg font-bold shadow-lg w-full" size="sm">
                        <Link href={`/erp/certificate/${cert.id}`} target="_blank">
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> เปิดดูฉบับเต็ม
                        </Link>
                    </Button>
                </div>
            </div>
            <CardContent className="p-4 flex-grow">
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">สถานะวุฒิบัตร</span>
                        <Badge variant="outline" className={cn('text-[9px] font-bold px-2 py-0 border-none rounded-full', status.color)}>
                            <status.icon className="w-2.5 h-2.5 mr-1" /> {status.text}
                        </Badge>
                    </div>
                    <Separator className="opacity-40" />
                    <div className="flex items-center justify-between text-[10px] font-medium">
                        <span className="text-muted-foreground">ออกเมื่อ:</span>
                        <span className="text-slate-700 dark:text-slate-300">{cert.completionDate ? format(parseISO(cert.completionDate), 'd MMM yy', {locale: th}) : 'N/A'}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-3 pt-0">
                <Button variant="ghost" size="sm" className="w-full rounded-lg text-[9px] font-bold uppercase tracking-widest h-9 hover:bg-primary/5 text-slate-500" asChild>
                    <a href={`/erp/certificate/${cert.id}`} download target="_blank">
                        <Download className="w-3 h-3 mr-1.5" /> Save PDF
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}

function getCertificateStatus(expiryDate: string | null | undefined) {
    if (!expiryDate) return { text: 'ตลอดชีพ', color: 'bg-blue-50 text-blue-700', icon: Infinity };
    const now = new Date();
    try {
        const expiry = parseISO(expiryDate);
        const daysLeft = differenceInDays(expiry, now);
        if (daysLeft < 0) return { text: 'หมดอายุ', color: 'bg-red-50 text-red-700', icon: ShieldX };
        if (daysLeft <= 90) return { text: `หมดใน ${daysLeft} วัน`, color: 'bg-amber-50 text-amber-700', icon: AlertTriangle };
        return { text: 'ปกติ', color: 'bg-green-50 text-green-700', icon: ShieldCheck };
    } catch { return { text: 'N/A', color: 'bg-gray-50', icon: Clock }; }
}

function EmptyState({ message, actionLink, actionText }: { message: string, actionLink: string, actionText: string }) {
    return (
        <div className="py-20 text-center border-2 border-dashed rounded-[2rem] bg-slate-50 dark:bg-slate-950/50">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-400">{message}</h3>
            <Button asChild className="mt-6 rounded-xl px-8 h-12 shadow-lg font-bold">
                <Link href={actionLink}>{actionText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>
    );
}
