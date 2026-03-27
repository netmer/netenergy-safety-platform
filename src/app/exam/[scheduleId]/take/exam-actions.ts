'use server';

import { db } from '@/lib/firebase';
import {
    doc, getDoc, collection, getDocs, query, where,
    runTransaction, updateDoc
} from 'firebase/firestore';
import type { ExamSession, AdditionalSectionResponse, ExamQuestion } from '@/lib/course-data';
import { buildExamSession } from '@/lib/exam-utils';

export async function submitExamSession(params: {
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
}): Promise<{ success: boolean; message: string; session?: ExamSession }> {
    try {
        const session = buildExamSession(params);

        await runTransaction(db, async (tx) => {
            // Check for duplicate submission
            const existing = await getDocs(
                query(
                    collection(db, 'examSessions'),
                    where('trainingRecordId', '==', params.trainingRecordId),
                    where('examType', '==', params.examType)
                )
            );
            // Only count non-superseded sessions — superseded ones have been reset by staff
            if (existing.docs.some(d => !d.data().superseded)) {
                throw new Error('ALREADY_SUBMITTED');
            }

            // Write exam session
            const sessionRef = doc(collection(db, 'examSessions'), session.id);
            tx.set(sessionRef, { ...session });

            // Write back to training record
            const recordRef = doc(db, 'trainingRecords', params.trainingRecordId);
            const scoreStr = String(Math.round(session.scorePercent));
            if (params.examType === 'pretest') {
                tx.update(recordRef, { preTestScore: scoreStr });
            } else {
                tx.update(recordRef, { postTestScore: scoreStr });
            }
        });

        return { success: true, message: 'ส่งคำตอบสำเร็จ', session };
    } catch (e) {
        if (e instanceof Error && e.message === 'ALREADY_SUBMITTED') {
            return { success: false, message: 'คุณได้ทำแบบทดสอบนี้ไปแล้ว' };
        }
        const error = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: `เกิดข้อผิดพลาด: ${error}` };
    }
}

export async function getExamSessionsForRecord(trainingRecordId: string): Promise<ExamSession[]> {
    const snap = await getDocs(
        query(collection(db, 'examSessions'), where('trainingRecordId', '==', trainingRecordId))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamSession);
}
