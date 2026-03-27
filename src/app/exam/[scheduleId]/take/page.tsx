import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { TrainingRecord, ExamTemplate, ExamConfig } from '@/lib/course-data';
import { ExamRunnerClient } from './exam-runner-client';
import { prepareExamQuestions } from '@/lib/exam-utils';
import { unstable_noStore as noStore } from 'next/cache';

export default async function TakeExamPage({
    params, searchParams
}: {
    params: Promise<{ scheduleId: string }>;
    searchParams: Promise<{ type?: string; recordId?: string }>;
}) {
    noStore();
    const { scheduleId } = await params;
    const { type, recordId } = await searchParams;

    if (!type || !recordId || (type !== 'pretest' && type !== 'posttest')) notFound();

    // Validate the training record belongs to this schedule
    const recordSnap = await getDoc(doc(db, 'trainingRecords', recordId));
    if (!recordSnap.exists()) notFound();
    const record = { id: recordSnap.id, ...recordSnap.data() } as TrainingRecord;
    if (record.scheduleId !== scheduleId) notFound();

    // Check if already submitted (ignore superseded sessions — those have been reset by staff)
    const existingSnap = await getDocs(
        query(
            collection(db, 'examSessions'),
            where('trainingRecordId', '==', recordId),
            where('examType', '==', type)
        )
    );
    const activeSession = existingSnap.docs.find(d => !d.data().superseded);
    if (activeSession) {
        // Already done and not reset — show blocked screen
        const existing = activeSession.data();
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-8 text-center space-y-4">
                    <p className="text-4xl">✅</p>
                    <h1 className="text-xl font-bold">ทำแบบทดสอบแล้ว</h1>
                    <p className="text-muted-foreground text-sm">
                        คุณได้ทำ{type === 'pretest' ? 'แบบทดสอบก่อนเรียน' : 'แบบทดสอบหลังเรียน'}ไปแล้ว
                    </p>
                    <p className="text-2xl font-bold text-blue-600">{existing.rawScore}/{existing.totalPoints} คะแนน</p>
                    <p className="text-sm text-muted-foreground">({existing.scorePercent}%)</p>
                    <a href={`/exam/${scheduleId}`} className="inline-block text-sm text-blue-600 underline">
                        กลับหน้าเลือกแบบทดสอบ
                    </a>
                </div>
            </div>
        );
    }

    // Load course and exam template
    const courseSnap = await getDoc(doc(db, 'courses', record.courseId));
    if (!courseSnap.exists()) notFound();
    const course = courseSnap.data();
    if (!course.examTemplateId) notFound();

    const templateSnap = await getDoc(doc(db, 'examTemplates', course.examTemplateId));
    if (!templateSnap.exists()) notFound();
    const template = { id: templateSnap.id, ...templateSnap.data() } as ExamTemplate;

    const config: ExamConfig | undefined = type === 'pretest' ? template.pretest : template.posttest;
    if (!config) notFound();

    // Prepare questions (shuffle if needed) on the server
    const questions = prepareExamQuestions(config);

    return (
        <ExamRunnerClient
            record={record}
            template={template}
            config={{ ...config, questions }}
            scheduleId={scheduleId}
        />
    );
}
