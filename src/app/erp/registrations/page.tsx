
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Course, CourseCategory, TrainingSchedule } from '@/lib/course-data';
import { RegistrationsClientPage } from './registrations-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export const metadata = {
    title: 'จัดการข้อมูลการลงทะเบียน | NET ERP',
    description: 'ระบบจัดการใบสมัครและสถานะพนักงานผู้เข้าอบรม',
};

export default async function ManageRegistrationsPage() {
    noStore(); 

    // Fetch filter metadata - strictly for dropdowns
    const [coursesSnapshot, categoriesSnapshot, schedulesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'courses'), orderBy('orderIndex', 'asc'))),
        getDocs(query(collection(db, 'courseCategories'), orderBy('orderIndex', 'asc'))),
        getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
    ]);

    const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
    const schedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingSchedule));

    // Data records are fetched on the client side via Real-time listeners to ensure authentication context
    return <RegistrationsClientPage 
        courses={courses} 
        categories={categories} 
        schedules={schedules}
    />;
}
