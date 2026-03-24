import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import type { Registration, TrainingSchedule } from '@/lib/course-data';
import { EditRegistrationForm } from './edit-form';
import { ArrowLeft, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function EditRegistrationPage({ params }: { params: Promise<{ registrationId: string }>}) {
    const { registrationId } = await params;

    const registrationDoc = await getDoc(doc(db, 'registrations', registrationId));
    if (!registrationDoc.exists()) {
        notFound();
    }
    const registration = { id: registrationDoc.id, ...registrationDoc.data() } as Registration;
    
    let availableSchedules: TrainingSchedule[] = [];
    if (registration.courseId) {
        const schedulesQuery = query(
            collection(db, 'trainingSchedules'),
            where('courseId', '==', registration.courseId)
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        availableSchedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingSchedule));
    }


    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                 <div>
                    <Button variant="outline" asChild>
                        <Link href="/erp/registrations">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับไปหน้าข้อมูลการลงทะเบียน
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold mt-4">แก้ไขข้อมูลการลงทะเบียน</h1>
                    <p className="text-muted-foreground">สำหรับหลักสูตร: {registration.courseTitle}</p>
                 </div>
                 {registration.status === 'confirmed' && (
                     <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800">
                        <FileWarning className="h-5 w-5"/>
                        <span className="text-sm font-medium">การลงทะเบียนนี้ถูกยืนยันแล้ว การแก้ไขอาจไม่ส่งผลต่อระเบียนการอบรมที่สร้างไปแล้ว</span>
                     </div>
                 )}
            </div>
            <EditRegistrationForm 
                registration={registration} 
                availableSchedules={availableSchedules} 
            />
        </div>
    );
}
