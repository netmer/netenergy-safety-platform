

import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import type { Course, TrainingSchedule, RegistrationForm, Registration, Client } from '@/lib/course-data';
import Link from 'next/link';
import { ChevronRight, FileText, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import { RegistrationClientPage } from './registration-client-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default async function RegisterPage(props: { params: { scheduleId: string } }) {
    const { params } = await props;
    const { scheduleId } = params;

    const scheduleDocRef = doc(db, 'trainingSchedules', scheduleId);
    const scheduleDoc = await getDoc(scheduleDocRef);
    if (!scheduleDoc.exists()) {
        notFound();
    }
    const schedule = { id: scheduleDoc.id, ...scheduleDoc.data() } as TrainingSchedule;
    
    if (schedule.status !== 'เปิดรับสมัคร') {
        return (
             <div className="py-20 text-center">
                 <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h1 className="mt-4 text-3xl font-bold">ไม่สามารถลงทะเบียนได้</h1>
                <p className="mt-2 text-muted-foreground">รอบอบรมนี้ไม่ได้อยู่ในสถานะ "เปิดรับสมัคร"</p>
                <p className="mt-4"><Link href={`/courses/course/${schedule.courseId}`} className="text-primary hover:underline">กลับไปที่หน้ารายละเอียดหลักสูตร</Link></p>
            </div>
        )
    }

    const courseDocRef = doc(db, 'courses', schedule.courseId);
    const courseDoc = await getDoc(courseDocRef);
    if (!courseDoc.exists()) {
        notFound();
    }
    const course = { id: courseDoc.id, ...courseDoc.data() } as Course;
    
    let form: RegistrationForm | null = null;
    if (course.registrationFormId) {
        const formDocRef = doc(db, 'registrationForms', course.registrationFormId);
        const formDoc = await getDoc(formDocRef);
        if (formDoc.exists()) {
            form = { id: formDoc.id, ...formDoc.data() } as RegistrationForm;
        }
    }
    
    if (!form) {
        return (
             <div className="py-20 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h1 className="mt-4 text-3xl font-bold">ไม่พบแบบฟอร์มลงทะเบียน</h1>
                <p className="mt-2 text-muted-foreground">ขออภัย, หลักสูตรนี้ยังไม่ได้กำหนดแบบฟอร์มการลงทะเบียน</p>
                <p className="mt-4">กรุณา <Link href="/contact" className="text-primary hover:underline">ติดต่อเรา</Link> เพื่อสอบถามข้อมูลเพิ่มเติม</p>
            </div>
        )
    }

    // Fetch existing clients for the combobox
    const clientsQuery = query(collection(db, 'clients'), orderBy('companyName'));
    const clientsSnapshot = await getDocs(clientsQuery);
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));


    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (startDate.getTime() === endDate.getTime()) {
            return format(startDate, 'd MMMM yyyy', { locale: th });
        }
        return `${format(startDate, 'd MMM', { locale: th })} - ${format(endDate, 'd MMMM yyyy', { locale: th })}`;
    };

    return (
        <div className="py-12 md:py-16">
            <div className="mb-8">
                <div className="flex items-center text-sm text-muted-foreground mb-4 flex-wrap">
                    <Link href="/courses" className="hover:text-primary">หลักสูตรทั้งหมด</Link>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <Link href={`/courses/course/${course.id}`} className="hover:text-primary truncate max-w-[200px] md:max-w-none">{course.title}</Link>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <span className="font-medium text-foreground">ลงทะเบียน</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="lg:col-span-2">
                    <RegistrationClientPage course={course} schedule={schedule} form={form} clients={clients} />
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">{course.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 mt-1 text-primary"/>
                                    <div>
                                        <h3 className="font-semibold text-foreground">วันที่อบรม</h3>
                                        <p>{formatDateRange(schedule.startDate, schedule.endDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 mt-1 text-primary"/>
                                     <div>
                                        <h3 className="font-semibold text-foreground">สถานที่</h3>
                                        <p>{schedule.location}</p>
                                    </div>
                                </div>
                             </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
