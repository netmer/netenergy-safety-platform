import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TrainingSchedule, Client } from '@/lib/course-data';
import { InhouseRegistrationClientPage } from './inhouse-registration-client-page';
import { XCircle, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    return { title: 'ลงทะเบียน Inhouse Training | NET Safety' };
}

function ErrorPage({ title, description }: { title: string; description: string }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold font-headline">{title}</h2>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
        </div>
    );
}

type Props = {
    params: { scheduleId: string };
    searchParams: { token?: string };
};

export default async function InhouseRegistrationPage({ params, searchParams }: Props) {
    const { scheduleId } = await params;
    const { token } = await searchParams;

    if (!token) {
        return <ErrorPage title="ลิงก์ไม่ถูกต้อง" description="ลิงก์นี้ไม่มี token กรุณาขอลิงก์ใหม่จากทีมงาน" />;
    }

    const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));

    if (!scheduleSnap.exists()) {
        return <ErrorPage title="ไม่พบรอบอบรม" description="รอบอบรมนี้อาจถูกลบหรือลิงก์ไม่ถูกต้อง" />;
    }

    const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as TrainingSchedule;

    if (schedule.scheduleType !== 'inhouse') {
        return <ErrorPage title="ลิงก์ไม่ถูกต้อง" description="รอบอบรมนี้ไม่ใช่ Inhouse" />;
    }

    if (!schedule.inhouseToken || schedule.inhouseToken !== token) {
        return <ErrorPage title="ลิงก์หมดอายุหรือไม่ถูกต้อง" description="ลิงก์นี้ถูกรีเซ็ตหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากทีมงาน NET Safety" />;
    }

    // Fetch linked client (optional). Fall back to schedule.clientName for manually typed companies.
    let client: Client | null = null;
    if (schedule.clientId) {
        const clientSnap = await getDoc(doc(db, 'clients', schedule.clientId));
        if (clientSnap.exists()) {
            client = { id: clientSnap.id, ...clientSnap.data() } as Client;
        }
    }
    // If no clientId but clientName was typed manually, synthesize a minimal Client-like object
    if (!client && schedule.clientName) {
        client = { id: '', companyName: schedule.clientName } as Client;
    }

    return <InhouseRegistrationClientPage schedule={schedule} client={client} token={token} />;
}
