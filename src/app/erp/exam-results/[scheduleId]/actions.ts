'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { ExamSession } from '@/lib/course-data';

export async function getExamSessionsForSchedule(scheduleId: string): Promise<ExamSession[]> {
    const snap = await getDocs(
        query(collection(db, 'examSessions'), where('scheduleId', '==', scheduleId))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamSession);
}

export async function getExamSessionsForCourse(courseId: string): Promise<ExamSession[]> {
    const snap = await getDocs(
        query(
            collection(db, 'examSessions'),
            where('courseId', '==', courseId),
            orderBy('submittedAt', 'desc')
        )
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamSession);
}
