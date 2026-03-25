'use client';

import type { TrainingSchedule, Registration, Course, TrainingRecord } from '@/lib/course-data';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Clock, Users, Calendar, ClipboardList, MapPin, Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ErpDashboardClientPageProps {
    keyMetrics: {
        activeSchedules: number;
        pendingRegistrations: number;
        pendingVerification: number;
        expiringSoon: number;
    };
    pipeline: {
        pendingRegistrations: number;
        pendingVerification: number;
        docsVerified: number;
        completedNoCert: number;
        pendingDelivery: number;
    };
    upcomingSchedule: (TrainingSchedule & { course: Course }) | null;
    recentRegistrations: (Registration & { course?: Course }) [];
    expiringRecords: (TrainingRecord & { course?: Course }) [];
}

const registrationStatusConfig: Record<Registration['status'], { label: string; className: string }> = {
    pending: { label: 'รอดำเนินการ', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    confirmed: { label: 'ยืนยันแล้ว', className: 'bg-green-100 text-green-800 border-green-200' },
    cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-800 border-red-200' },
};


export function ErpDashboardClientPage({
    keyMetrics,
    pipeline,
    upcomingSchedule,
    recentRegistrations,
    expiringRecords
}: ErpDashboardClientPageProps) {

  const getCoordinatorName = (reg: Registration): string => {
    const field = reg.formSchema?.find(f => f.type === 'coordinator');
    return field ? reg.formData[field.id]?.name || reg.userDisplayName || reg.userEmail : reg.userDisplayName || reg.userEmail;
  };
  
  const getDaysUntilExpiry = (expiryDate: string | null | undefined): number | null => {
    if (!expiryDate) return null;
    try {
      return differenceInDays(parseISO(expiryDate), new Date());
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild>
            <Link href="/erp/schedule">
                <Calendar className="mr-2 h-4 w-4" /> จัดการตารางอบรม
            </Link>
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รอบอบรมที่เปิดอยู่</CardTitle>
            <Calendar className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.activeSchedules}</div>
            <p className="text-xs text-primary-foreground/80">รอบที่กำลังจะมาถึง</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ใบสมัครใหม่</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.pendingRegistrations}</div>
            <p className="text-xs text-muted-foreground">ใบสมัครที่รอการตรวจสอบ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รอตรวจเอกสาร</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.pendingVerification}</div>
            <p className="text-xs text-muted-foreground">ผู้อบรมที่ต้องตรวจเอกสาร</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ใบรับรองใกล้หมดอายุ</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">รายการใน 90 วันข้างหน้า</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Pipeline */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-primary" /> สถานะงานในระบบ (Workflow Pipeline)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex items-stretch gap-0 min-w-[700px]">
              {[
                { count: pipeline.pendingRegistrations, label: 'ใบสมัครรอรับรอง', href: '/erp/registrations', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { count: pipeline.pendingVerification, label: 'รอตรวจเอกสาร', href: '/erp/attendees', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { count: pipeline.docsVerified, label: 'เอกสารครบ / รอตัดเกรด', href: '/erp/attendees', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                { count: pipeline.completedNoCert, label: 'ผ่านอบรม / รอออกใบเซอร์', href: '/erp/certificate', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { count: pipeline.pendingDelivery, label: 'รอจัดส่ง', href: '/erp/delivery', color: 'bg-violet-50 border-violet-200 text-violet-700' },
              ].map((stage, i, arr) => (
                <div key={stage.label} className="flex items-center flex-1">
                  <Link href={stage.href} className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border text-center transition-all hover:shadow-md',
                    stage.count > 0 ? stage.color : 'bg-muted/30 border-muted text-muted-foreground opacity-50',
                  )}>
                    <span className="text-3xl font-black tabular-nums">{stage.count}</span>
                    <span className="text-[11px] font-bold leading-tight">{stage.label}</span>
                    {stage.count > 0 && <span className="text-[10px] font-semibold opacity-70 mt-0.5">ดูรายการ →</span>}
                  </Link>
                  {i < arr.length - 1 && <ChevronRight className="w-5 h-5 text-muted-foreground/40 mx-1 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="xl:col-span-2">
             <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>ใบรับรองใกล้หมดอายุ (90 วัน)</CardTitle>
                    <CardDescription>แสดง 5 รายการที่ใกล้หมดอายุที่สุด</CardDescription>
                </div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/erp/history">
                        ดูประวัติทั้งหมด <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
             <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-semibold">ชื่อผู้ถือใบรับรอง</TableHead>
                            <TableHead className="font-semibold">บริษัท</TableHead>
                            <TableHead className="font-semibold">หลักสูตร</TableHead>
                            <TableHead className="text-right font-semibold">วันหมดอายุ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expiringRecords.map(rec => {
                           const daysLeft = getDaysUntilExpiry(rec.expiryDate);
                            return (
                                <TableRow key={rec.id}>
                                    <TableCell className="font-medium">{rec.attendeeName}</TableCell>
                                    <TableCell className="text-muted-foreground">{rec.companyName}</TableCell>
                                    <TableCell className="text-muted-foreground max-w-[200px] truncate" title={rec.course?.title}>
                                        {rec.course?.shortName || rec.courseTitle}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-medium">{rec.expiryDate ? format(parseISO(rec.expiryDate), 'd MMM yyyy', {locale: th}) : '-'}</div>
                                        {daysLeft !== null && <div className="text-xs text-amber-600 font-semibold">({daysLeft} วัน)</div>}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                         {expiringRecords.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">ไม่มีใบรับรองที่ใกล้หมดอายุใน 90 วัน</TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {upcomingSchedule ? (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        <CardTitle className="text-lg">รอบอบรมถัดไป</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-secondary">
                        <h3 className="font-semibold" title={upcomingSchedule.course.title}>
                            {upcomingSchedule.course.shortName || upcomingSchedule.course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                            <Calendar className="h-4 w-4" /> 
                            {format(new Date(upcomingSchedule.startDate), 'd MMMM yyyy', { locale: th })}
                        </p>
                         <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4" /> 
                            {upcomingSchedule.location}
                        </p>
                    </div>
                     <Button asChild className="w-full rounded-xl">
                        <Link href="/erp/attendees">จัดการผู้อบรม</Link>
                    </Button>
                </CardContent>
            </Card>
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">รอบอบรมถัดไป</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48 text-center">
                    <p className="text-muted-foreground font-light">ไม่มีรอบอบรมที่กำลังจะมาถึง</p>
                </CardContent>
            </Card>
        )}

         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>ใบสมัครล่าสุด</CardTitle>
                    <CardDescription>แสดง 5 ใบสมัครล่าสุดที่เข้ามาในระบบ</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href="/erp/registrations">
                        จัดการทั้งหมด <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-semibold">หลักสูตร</TableHead>
                            <TableHead className="font-semibold">ผู้ประสานงาน</TableHead>
                             <TableHead className="font-semibold">วันที่สมัคร</TableHead>
                             <TableHead className="font-semibold">สถานะ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentRegistrations.map(reg => {
                            const statusConfig = registrationStatusConfig[reg.status] || {label: 'ไม่ทราบ', className: 'bg-gray-100 text-gray-800'};
                            return (
                                <TableRow key={reg.id}>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={reg.course?.title}>{reg.course?.shortName || reg.courseTitle}</TableCell>
                                    <TableCell className="text-sm">{getCoordinatorName(reg)}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">{format(new Date(reg.registrationDate), 'd MMM yy', {locale: th})}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-semibold text-[10px]", statusConfig.className)}>
                                            {statusConfig.label}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                         {recentRegistrations.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground italic font-light">ยังไม่มีใบสมัครเข้ามา</TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
