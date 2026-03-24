import { HistoryClientPage } from './history-client-page';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { Course, Client } from '@/lib/course-data';
import { unstable_noStore as noStore } from 'next/cache';

export const metadata = {
    title: 'ประวัติการอบรม | NET ERP',
};

export default async function TrainingHistoryPage() {
    noStore();

    // Fetch courses (small collection, used for course filter dropdown)
    // Fetch clients (small collection, used for company filter dropdown — much cheaper than scanning trainingRecords)
    const [courseSnap, clientSnap] = await Promise.all([
        getDocs(query(collection(db, 'courses'), orderBy('title'))),
        getDocs(query(collection(db, 'clients'), orderBy('companyName'))),
    ]);

    const courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const companies = clientSnap.docs
        .map(d => (d.data() as Client).companyName)
        .filter(Boolean);

    return <HistoryClientPage courses={courses} companies={companies} />;
}
