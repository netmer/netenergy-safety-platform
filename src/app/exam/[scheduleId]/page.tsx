import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { TrainingSchedule, ExamTemplate, TrainingRecord, ExamSession } from '@/lib/course-data';
import { ExamLandingClient } from './exam-landing-client';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ExamLandingPage({
    params,
    searchParams,
}: {
    params: Promise<{ scheduleId: string }>;
    searchParams: Promise<{ focus?: string }>;
}) {
    noStore();
    const { scheduleId } = await params;
    const { focus } = await searchParams;

    const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));
    if (!scheduleSnap.exists()) notFound();

    const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as TrainingSchedule;

    const courseSnap = await getDoc(doc(db, 'courses', schedule.courseId));
    if (!courseSnap.exists()) notFound();
    const course = courseSnap.data();

    if (!course.examTemplateId) {
        // Course has no exam — show a message
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-8 text-center space-y-3">
                    <p className="text-4xl">📋</p>
                    <h1 className="text-xl font-bold">{schedule.courseTitle}</h1>
                    <p className="text-muted-foreground">หลักสูตรนี้ไม่มีแบบทดสอบออนไลน์</p>
                </div>
            </div>
        );
    }

    const [templateSnap, recordsSnap, sessionsSnap] = await Promise.all([
        getDoc(doc(db, 'examTemplates', course.examTemplateId)),
        getDocs(query(collection(db, 'trainingRecords'), where('scheduleId', '==', scheduleId))),
        getDocs(query(collection(db, 'examSessions'), where('scheduleId', '==', scheduleId))),
    ]);

    if (!templateSnap.exists()) notFound();

    const template = { id: templateSnap.id, ...templateSnap.data() } as ExamTemplate;
    const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TrainingRecord);
    // Only pass active (non-superseded) sessions to the client
    const sessions = sessionsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as ExamSession)
        .filter(s => !s.superseded);

    return (
        <ExamLandingClient
            schedule={schedule}
            template={template}
            records={records}
            sessions={sessions}
            focusType={focus === 'pretest' ? 'pretest' : focus === 'posttest' ? 'posttest' : undefined}
        />
    );
}
