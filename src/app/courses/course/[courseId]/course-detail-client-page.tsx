'use client';

import type { Course, CourseCategory, TrainingSchedule } from '@/lib/course-data';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    ChevronRight, Award, ListChecks, Sparkles, UserCheck, 
    CalendarDays, Phone, Banknote, Target, ClipboardList, 
    FileText, MapPin, Share2, Printer, CheckCircle2,
    Users, Clock, GraduationCap, ShieldCheck, ArrowRight,
    Building, Info, BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

type ActiveSchedule = TrainingSchedule & { formattedDate?: string };

interface CourseDetailClientPageProps {
  course: Course;
  category?: CourseCategory;
  activeSchedules: ActiveSchedule[];
}

function formatDateRange(start: string, end: string): string {
    if (!start || !end) return '';
    try {
        const startDate = parseISO(start);
        const endDate = parseISO(end);

        if (startDate.getTime() === endDate.getTime()) {
            return format(startDate, 'd MMMM yyyy', { locale: th });
        }
        
        if (startDate.getMonth() === endDate.getMonth()) {
            return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: th })}`;
        }

        if (startDate.getFullYear() === endDate.getFullYear()) {
            return `${format(startDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy', { locale: th })}`;
        }
        
        return `${format(startDate, 'd MMMM yyyy', { locale: th })} - ${format(endDate, 'd MMMM yyyy', { locale: th })}`;
    } catch (error) {
        return "รูปแบบวันที่ไม่ถูกต้อง";
    }
}

function SectionHeading({ title, icon: Icon, description }: { title: string, icon: React.ElementType, description?: string }) {
    return (
        <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-3 font-headline text-slate-900 dark:text-white group">
                <div className="p-2 rounded-xl bg-primary/10 text-primary transition-transform duration-300">
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                {title}
            </h2>
            {description && <p className="text-muted-foreground mt-2 font-light text-sm md:text-base md:ml-12">{description}</p>}
        </div>
    );
}

function DetailList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="grid gap-3">
        {items.map((item, index) => (
          <motion.li 
            initial={{ opacity: 0, y: 5 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            key={index} 
            className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className="mt-1 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-slate-600 dark:text-slate-400 leading-relaxed font-light text-sm">{item}</span>
          </motion.li>
        ))}
    </ul>
  );
}

function ScheduleStatusBadge({ status }: { status: TrainingSchedule['status'] }) {
    switch (status) {
        case 'เปิดรับสมัคร':
            return <Badge className="bg-green-500 hover:bg-green-600 border-none font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">พร้อมลงทะเบียน</Badge>;
        case 'เต็ม':
            return <Badge variant="destructive" className="font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider">เต็มแล้ว</Badge>;
        case 'เร็วๆ นี้':
            return <Badge className="bg-amber-500 text-white hover:bg-amber-600 border-none font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wider">เร็วๆ นี้</Badge>;
        default:
            return <Badge variant="secondary" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">{status}</Badge>;
    }
}

export function CourseDetailClientPage({ course, category, activeSchedules }: CourseDetailClientPageProps) {
  
  const formattedSchedules = useMemo(() => activeSchedules.map(schedule => ({
    ...schedule,
    formattedDate: formatDateRange(schedule.startDate, schedule.endDate),
  })), [activeSchedules]);

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (course.topics && course.topics.length > 0) {
        tabs.push({ id: 'topics', label: 'หัวข้อการอบรม', icon: ListChecks, description: 'เจาะลึกทุกหัวข้อที่สำคัญ', data: course.topics });
    }
    if (course.agenda && course.agenda.length > 0) {
        tabs.push({ id: 'agenda', label: 'กำหนดการ', icon: ClipboardList, description: 'ตารางเวลาการเรียนรู้', data: course.agenda });
    }
    if (course.benefits && course.benefits.length > 0) {
        tabs.push({ id: 'benefits', label: 'ความคุ้มค่า', icon: Sparkles, description: 'สิ่งที่คุณจะได้รับ', data: course.benefits });
    }
    return tabs;
  }, [course]);

  const RegistrationButton = ({ session, course, className, fullWidthOnMobile = false }: { session: ActiveSchedule, course: Course, className?: string, fullWidthOnMobile?: boolean }) => {
      const canRegister = session.status === 'เปิดรับสมัคร' && !!course.registrationFormId;
      
      if (!canRegister) {
          return (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <span tabIndex={0} className={cn("inline-block", fullWidthOnMobile ? "w-full" : "w-full sm:w-auto", className)}>
                              <Button disabled size="sm" className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border-none">จองที่นั่ง</Button>
                          </span>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>{session.status === 'เต็ม' ? 'รอบนี้เต็มแล้ว' : 'ยังไม่เปิดลงทะเบียนออนไลน์'}</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          );
      }

      return (
          <Button asChild size="sm" className={cn("rounded-xl font-semibold shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95 px-6", fullWidthOnMobile ? "w-full" : "w-full sm:w-auto", className)}>
              <Link href={`/register/${session.id}`}>จองที่นั่ง <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
          </Button>
      );
  }

  return (
    <div className="pb-24 pt-4 sm:pt-6">
        {/* --- Hero Section --- */}
        <section className="relative rounded-[2rem] overflow-hidden mb-10 md:mb-16 min-h-[350px] md:min-h-[450px] flex items-end shadow-2xl border border-slate-200/50 dark:border-slate-800/50">
             <Image
              src={course.image || "https://picsum.photos/seed/course/1200/800"}
              alt={course.title}
              fill
              className="object-cover"
              priority
              data-ai-hint={course.hint}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
            
            <div className="container relative z-10 mx-auto px-6 md:px-12 pb-10 md:pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl"
                >
                    <nav aria-label="breadcrumb" className="flex items-center text-[10px] md:text-xs font-semibold text-white/60 mb-4 md:mb-6 uppercase tracking-[0.2em]">
                        <Link href="/courses" className="hover:text-primary transition-colors">Academy</Link>
                        {category && (
                            <>
                            <ChevronRight className="h-3 w-3 mx-2 opacity-50" />
                            <Link href={`/courses/${category.id}`} className="hover:text-primary transition-colors">{category.title}</Link>
                            </>
                        )}
                    </nav>
                    
                    <h1 className="text-2xl md:text-4xl font-semibold text-white font-headline leading-[1.2] mb-6 drop-shadow-md">
                        {course.title}
                    </h1>

                    <div className="flex flex-wrap gap-3 items-center">
                        {course.price && (
                            <div className="flex items-center gap-2 bg-primary px-4 py-2 rounded-xl text-white font-semibold text-base md:text-lg shadow-xl shadow-primary/20">
                                <Banknote className="w-4 h-4 md:w-5 md:h-5" />
                                {course.price}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        <div className="lg:col-span-8 space-y-10 md:space-y-14">
          
          {/* --- Description --- */}
          <motion.section 
            initial={{ opacity: 0 }} 
            whileInView={{ opacity: 1 }} 
            viewport={{ once: true }}
          >
            <SectionHeading title="รายละเอียดหลักสูตร" icon={Target} />
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light mb-8">
              {course.description}
            </p>
            
            {(course.objectives?.length || 0) > 0 || (course.qualifications?.length || 0) > 0 ? (
                <div className="grid md:grid-cols-2 gap-5">
                    {course.objectives && course.objectives.length > 0 && (
                        <div className="rounded-2xl border-none bg-blue-50/50 dark:bg-blue-900/10 p-6 shadow-sm">
                            <h4 className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-4">
                                <GraduationCap className="w-4 h-4" /> ผลลัพธ์หลังการเรียนจบ
                            </h4>
                            <DetailList items={course.objectives} />
                        </div>
                    )}
                    {course.qualifications && course.qualifications.length > 0 && (
                        <div className="rounded-2xl border-none bg-emerald-50/50 dark:bg-emerald-900/10 p-6 shadow-sm">
                            <h4 className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-4">
                                <Users className="w-4 h-4" /> กลุ่มเป้าหมายที่เหมาะสม
                            </h4>
                            <DetailList items={course.qualifications} />
                        </div>
                    )}
                </div>
            ) : null}
          </motion.section>

          <Separator className="opacity-50" />

          {/* --- Tabs Content Section --- */}
          {availableTabs.length > 0 && (
            <section className="scroll-mt-24" id="curriculum">
                <Tabs defaultValue={availableTabs[0].id} className="w-full">
                    <TabsList className="flex w-full overflow-x-auto h-auto rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 no-scrollbar border">
                        {availableTabs.map(tab => (
                            <TabsTrigger key={tab.id} value={tab.id} className="flex-1 min-w-[120px] rounded-xl font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-900 text-xs md:text-sm">
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="mt-8">
                        {availableTabs.map(tab => (
                            <TabsContent key={tab.id} value={tab.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500 focus-visible:outline-none">
                                <SectionHeading title={tab.label} icon={tab.icon} description={tab.description} />
                                <DetailList items={tab.data} />
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </section>
          )}
          
          {/* --- Schedule Section --- */}
          {formattedSchedules.length > 0 && (
            <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }}
                id="schedules" 
                className="scroll-mt-24"
            >
              <SectionHeading title="รอบการอบรมที่เปิดรับ" icon={CalendarDays} description="ตรวจสอบวันและสถานที่ ก่อนลงทะเบียน" />
              
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-950">
                    <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50 border-b">
                        <TableRow className="border-none">
                            <TableHead className="py-5 pl-6 font-semibold text-slate-900 dark:text-slate-100">วัน/เดือน/ปี</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">สถานที่ / รูปแบบ</TableHead>
                            <TableHead className="font-semibold text-center text-slate-900 dark:text-slate-100">สถานะ</TableHead>
                            <TableHead className="text-right pr-6 font-semibold text-slate-900 dark:text-slate-100">ดำเนินการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {formattedSchedules.map((session) => (
                            <TableRow key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <TableCell className="font-semibold py-6 pl-6 text-base whitespace-nowrap">
                                    {session.formattedDate}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-400">
                                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                                        {session.location}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <ScheduleStatusBadge status={session.status} />
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <RegistrationButton session={session} course={course} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </Card>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {formattedSchedules.map((session) => (
                    <Card key={session.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-md">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Training Date</p>
                                    <p className="text-lg font-semibold">{session.formattedDate}</p>
                                </div>
                                <ScheduleStatusBadge status={session.status} />
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-medium">{session.location}</span>
                            </div>
                            
                            <Separator className="opacity-50" />
                            
                            <RegistrationButton session={session} course={course} fullWidthOnMobile />
                        </CardContent>
                    </Card>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* --- Sticky Sidebar --- */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky top-24 space-y-6">
            <Card className="rounded-[2rem] border-none shadow-2xl bg-slate-950 text-white overflow-hidden p-8 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <div className="inline-flex p-2 rounded-xl bg-primary/20 text-primary mb-6">
                        <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold mb-6 font-headline">ข้อมูลการอบรม</h3>
                    
                    <div className="space-y-6">
                        {course.price && (
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                                    <Banknote className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">ค่าธรรมเนียม</p>
                                    <p className="text-lg md:text-xl font-bold">{course.price}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                                <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">รูปแบบการจัด</p>
                                <p className="text-sm font-medium text-slate-300">Public & In-house Training</p>
                            </div>
                        </div>
                    </div>
                    
                    <Separator className="bg-white/10 my-8" />
                    
                    <div className="space-y-3">
                        <Button size="lg" className="w-full h-14 rounded-2xl font-semibold text-base shadow-xl shadow-primary/20" asChild>
                            <Link href="#schedules">
                                ดูรอบอบรมและจองที่นั่ง
                            </Link>
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
                <div className="p-2.5 bg-primary/10 rounded-xl w-fit mb-5 text-primary">
                    <Building className="w-6 h-6" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-3 font-headline">จัดอบรมภายในองค์กร</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 font-light">
                    เราพร้อมปรับเนื้อหาให้ตรงกับหน้างานจริงขององค์กรคุณ และเดินทางไปจัดอบรมถึงที่ทั่วประเทศ
                </p>
                <Button size="lg" variant="outline" className="w-full h-14 rounded-2xl font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50" asChild>
                    <Link href={`/request-quote?courseId=${course.id}`}>
                        ขอใบเสนอราคา In-house
                    </Link>
                </Button>
                <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    <Phone className="w-3 h-3 text-primary" /> ปรึกษาด่วน: 0-2582-2111
                </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}