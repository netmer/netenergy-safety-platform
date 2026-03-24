
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { Registration, Course } from '@/lib/course-data';
import { BillingClientPage } from './billing-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function BillingPage() {
    noStore();

    const registrationsQuery = query(
        collection(db, 'registrations'),
        where('status', '==', 'confirmed'),
        orderBy('registrationDate', 'desc')
    );

    const [registrationsSnapshot, coursesSnapshot] = await Promise.all([
        getDocs(registrationsQuery),
        getDocs(query(collection(db, 'courses'), orderBy('title'))),
    ]);

    const registrations = registrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

    return <BillingClientPage initialRegistrations={registrations} courses={courses} />;
}
