'use server';

import { nanoid } from 'nanoid';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, addDoc, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { TrainingSchedule } from '@/lib/course-data';
import { buildFullName } from '@/lib/attendee-utils';
import { generateSearchTokens } from '@/lib/search-utils';

export type InhouseAttendeeInput = {
    title: string;
    firstName: string;
    lastName: string;
    attendeeId?: string; // เลขบัตรประชาชน (optional)
    companyName: string;
};

export async function submitInhouseAttendees(
    scheduleId: string,
    token: string,
    attendees: InhouseAttendeeInput[]
): Promise<{ success: boolean; message: string; count: number }> {
    try {
        // Server-side token validation
        const scheduleRef = doc(db, 'trainingSchedules', scheduleId);
        const scheduleSnap = await getDoc(scheduleRef);

        if (!scheduleSnap.exists()) {
            return { success: false, message: 'ไม่พบรอบอบรมนี้', count: 0 };
        }

        const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as TrainingSchedule;

        if (schedule.scheduleType !== 'inhouse') {
            return { success: false, message: 'รอบอบรมนี้ไม่ใช่ Inhouse', count: 0 };
        }

        if (!schedule.inhouseToken || schedule.inhouseToken !== token) {
            return { success: false, message: 'ลิงก์ไม่ถูกต้องหรือหมดอายุ', count: 0 };
        }

        if (!attendees || attendees.length === 0) {
            return { success: false, message: 'กรุณาเพิ่มรายชื่อผู้เข้าอบรมอย่างน้อย 1 คน', count: 0 };
        }

        const now = new Date().toISOString();
        const batch = writeBatch(db);
        const recordsRef = collection(db, 'trainingRecords');

        for (const attendee of attendees) {
            const attendeeName = buildFullName(attendee.title, attendee.firstName, attendee.lastName);
            const companyName = attendee.companyName.trim() || '-';
            const newRecordRef = doc(recordsRef);

            batch.set(newRecordRef, {
                attendeeName,
                attendeeTitle: attendee.title || '',
                attendeeFirstName: attendee.firstName,
                attendeeLastName: attendee.lastName,
                attendeeId: attendee.attendeeId?.trim() || null,
                companyName,
                scheduleId,
                courseId: schedule.courseId,
                courseTitle: schedule.courseTitle,
                registrationId: `inhouse-${scheduleId}`,
                registrationAttendeeId: nanoid(),
                status: 'pending_verification',
                attendance: 'not_checked_in',
                isWalkIn: true,
                completionDate: '',
                searchTokens: generateSearchTokens(attendeeName, companyName, attendee.firstName, attendee.lastName),
                createdAt: now,
            });
        }

        await batch.commit();
        revalidatePath('/erp/attendees');

        return { success: true, message: `เพิ่มผู้เข้าอบรม ${attendees.length} คนเรียบร้อยแล้ว`, count: attendees.length };
    } catch (e) {
        console.error('submitInhouseAttendees error:', e);
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่', count: 0 };
    }
}
