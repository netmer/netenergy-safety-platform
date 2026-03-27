import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { TrainingSchedule, EvaluationTemplate, EvaluationSession } from '@/lib/course-data';
import { EvalResultsClientPage } from './eval-results-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function EvalResultsPage({
    params,
}: {
    params: Promise<{ scheduleId: string }>;
}) {
    noStore();
    const { scheduleId } = await params;

    const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));
    if (!scheduleSnap.exists()) notFound();
    const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as TrainingSchedule;

    const courseSnap = await getDoc(doc(db, 'courses', schedule.courseId));
    if (!courseSnap.exists()) notFound();
    const course = courseSnap.data();
    if (!course.evaluationTemplateId) notFound();

    const [templateSnap, sessionsSnap] = await Promise.all([
        getDoc(doc(db, 'evaluationTemplates', course.evaluationTemplateId)),
        getDocs(query(collection(db, 'evaluationSessions'), where('scheduleId', '==', scheduleId))),
    ]);

    if (!templateSnap.exists()) notFound();
    const template = { id: templateSnap.id, ...templateSnap.data() } as EvaluationTemplate;
    const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as EvaluationSession);

    return <EvalResultsClientPage schedule={schedule} template={template} sessions={sessions} />;
}
