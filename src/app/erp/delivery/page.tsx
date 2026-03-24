import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Course, TrainingSchedule } from '@/lib/course-data';
import { DeliveryClientPage } from './delivery-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export const metadata = {
    title: 'การจัดส่ง | NET ERP',
};

export default async function DeliveryPage() {
    noStore();
    // Only fetch public collections server-side; deliveryPackages are fetched client-side (requires auth)
    const [courseSnap, schedSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
    ]);

    const courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const schedules = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingSchedule));

    return <DeliveryClientPage courses={courses} schedules={schedules} />;
}
