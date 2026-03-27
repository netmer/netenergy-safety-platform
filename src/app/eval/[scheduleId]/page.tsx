import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { TrainingSchedule, EvaluationTemplate } from '@/lib/course-data';
import { EvalLandingClient } from './eval-landing-client';
import { unstable_noStore as noStore } from 'next/cache';

export default async function EvalLandingPage({
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

    if (!course.evaluationTemplateId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-8 text-center space-y-3">
                    <p className="text-4xl">📋</p>
                    <h1 className="text-xl font-bold">{schedule.courseTitle}</h1>
                    <p className="text-muted-foreground">หลักสูตรนี้ไม่มีแบบประเมินออนไลน์</p>
                </div>
            </div>
        );
    }

    const templateSnap = await getDoc(doc(db, 'evaluationTemplates', course.evaluationTemplateId));
    if (!templateSnap.exists()) notFound();
    const template = { id: templateSnap.id, ...templateSnap.data() } as EvaluationTemplate;

    return <EvalLandingClient schedule={schedule} template={template} />;
}
