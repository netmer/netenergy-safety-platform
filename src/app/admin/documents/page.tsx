import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import type { TrainingSchedule, Registration } from '@/lib/course-data';
import { DocumentsClientPage } from './documents-client-page';

async function getSchedules(): Promise<TrainingSchedule[]> {
    const snap = await getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingSchedule));
}

async function getRecentRegistrations(): Promise<Registration[]> {
    const snap = await getDocs(query(
        collection(db, 'registrations'),
        where('status', '==', 'confirmed'),
        orderBy('registrationDate', 'desc'),
        limit(50)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
}

export default async function AdminDocumentsPage() {
    const [schedules, registrations] = await Promise.all([getSchedules(), getRecentRegistrations()]);
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">ศูนย์จัดการเอกสาร & อีเมล</h1>
                <p className="text-muted-foreground font-light text-sm">ทดสอบ API, สร้างเอกสาร, และส่งอีเมลหมู่ไปยังผู้อบรม</p>
            </div>
            <DocumentsClientPage schedules={schedules} registrations={registrations} />
        </div>
    );
}
