import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryPackage, Course, TrainingSchedule } from '@/lib/course-data';
import { DeliveryClientPage } from './delivery-client-page';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
    const [pkgSnap, courseSnap, schedSnap] = await Promise.all([
        getDocs(query(collection(db, 'deliveryPackages'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'trainingSchedules')),
    ]);

    const packages = pkgSnap.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryPackage));
    const courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const schedules = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingSchedule));

    return <DeliveryClientPage initialPackages={packages} courses={courses} schedules={schedules} />;
}
