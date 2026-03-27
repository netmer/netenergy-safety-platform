import type { ExamConfig, ExamQuestion, ExamAnswer, ExamSession, AdditionalSectionResponse } from './course-data';
import { nanoid } from 'nanoid';

export function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function prepareExamQuestions(config: ExamConfig): ExamQuestion[] {
    return config.shuffleQuestions ? shuffleArray(config.questions) : config.questions;
}

export function calculateScore(
    questions: ExamQuestion[],
    answers: Record<string, string | null>
): { rawScore: number; totalPoints: number; scorePercent: number; answers: ExamAnswer[] } {
    let rawScore = 0;
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    const examAnswers: ExamAnswer[] = questions.map(q => {
        const selected = answers[q.id] ?? null;
        const isCorrect = selected !== null && selected === q.correctOptionId;
        if (isCorrect) rawScore += q.points;
        return { questionId: q.id, selectedOptionId: selected, isCorrect };
    });

    const scorePercent = totalPoints > 0 ? Math.round((rawScore / totalPoints) * 100) : 0;
    return { rawScore, totalPoints, scorePercent, answers: examAnswers };
}

export function buildExamSession(params: {
    examTemplateId: string;
    scheduleId: string;
    courseId: string;
    trainingRecordId: string;
    attendeeName: string;
    seatNumber: string;
    examType: 'pretest' | 'posttest';
    questions: ExamQuestion[];
    answers: Record<string, string | null>;
    additionalResponses?: AdditionalSectionResponse[];
    startedAt: string;
    passingScore?: number;
}): Omit<ExamSession, 'id'> & { id: string } {
    const { rawScore, totalPoints, scorePercent, answers } = calculateScore(
        params.questions,
        params.answers
    );
    const passed =
        params.passingScore !== undefined ? scorePercent >= params.passingScore : null;

    return {
        id: nanoid(),
        examTemplateId: params.examTemplateId,
        scheduleId: params.scheduleId,
        courseId: params.courseId,
        trainingRecordId: params.trainingRecordId,
        attendeeName: params.attendeeName,
        seatNumber: params.seatNumber,
        examType: params.examType,
        startedAt: params.startedAt,
        submittedAt: new Date().toISOString(),
        answers,
        rawScore,
        totalPoints,
        scorePercent,
        passed,
        additionalResponses: params.additionalResponses,
        timeTakenSeconds: Math.round(
            (Date.now() - new Date(params.startedAt).getTime()) / 1000
        ),
    };
}

export function getExamModeLabel(mode: 'none' | 'pretest_only' | 'posttest_only' | 'both'): string {
    switch (mode) {
        case 'none': return 'ไม่มีการทดสอบ';
        case 'pretest_only': return 'ทดสอบก่อนเรียนเท่านั้น';
        case 'posttest_only': return 'ทดสอบหลังเรียนเท่านั้น';
        case 'both': return 'ก่อนเรียนและหลังเรียน';
    }
}
