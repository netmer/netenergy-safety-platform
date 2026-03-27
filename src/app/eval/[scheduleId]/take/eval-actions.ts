'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { calculateEvaluationAverages } from '@/lib/evaluation-utils';
import type { EvaluationTemplate } from '@/lib/course-data';

export async function submitEvaluation(
    template: EvaluationTemplate,
    scheduleId: string,
    courseId: string,
    ratings: Record<string, number>,
    openAnswers: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
    const { averageScore, sectionAverages } = calculateEvaluationAverages(template, ratings);

    await addDoc(collection(db, 'evaluationSessions'), {
        templateId: template.id,
        scheduleId,
        courseId,
        submittedAt: new Date().toISOString(),
        ratings,
        openAnswers,
        averageScore,
        sectionAverages,
    });

    return { success: true };
}
