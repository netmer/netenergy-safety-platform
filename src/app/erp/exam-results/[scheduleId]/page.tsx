import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { TrainingSchedule, ExamTemplate, TrainingRecord } from '@/lib/course-data';
import { getExamSessionsForSchedule } from './actions';
import { ExamResultsClientPage } from './exam-results-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ExamResultsPage({ params }: { params: Promise<{ scheduleId: string }> }) {
    noStore();
    const { scheduleId } = await params;

    const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));
    if (!scheduleSnap.exists()) notFound();

    const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as TrainingSchedule;

    const [sessions, recordsSnap, templateSnap] = await Promise.all([
        getExamSessionsForSchedule(scheduleId),
        getDocs(query(collection(db, 'trainingRecords'), where('scheduleId', '==', scheduleId))),
        // Find exam template for this course
        (async () => {
            const courseSnap = await getDoc(doc(db, 'courses', schedule.courseId));
            if (!courseSnap.exists()) return null;
            const course = courseSnap.data();
            if (!course.examTemplateId) return null;
            const tmplSnap = await getDoc(doc(db, 'examTemplates', course.examTemplateId));
            if (!tmplSnap.exists()) return null;
            return { id: tmplSnap.id, ...tmplSnap.data() } as ExamTemplate;
        })(),
    ]);

    const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TrainingRecord);

    return (
        <ExamResultsClientPage
            schedule={schedule}
            sessions={sessions}
            records={records}
            template={templateSnap}
        />
    );
}
