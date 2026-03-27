import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { TrainingSchedule, EvaluationTemplate } from '@/lib/course-data';
import { EvalRunnerClient } from './eval-runner-client';
import { unstable_noStore as noStore } from 'next/cache';

export default async function TakeEvalPage({
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

    const templateSnap = await getDoc(doc(db, 'evaluationTemplates', course.evaluationTemplateId));
    if (!templateSnap.exists()) notFound();
    const template = { id: templateSnap.id, ...templateSnap.data() } as EvaluationTemplate;

    return (
        <EvalRunnerClient
            template={template}
            scheduleId={scheduleId}
            courseId={schedule.courseId}
        />
    );
}
