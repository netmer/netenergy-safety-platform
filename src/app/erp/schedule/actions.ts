'use server';

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Course, Registration, TrainingSchedule } from '@/lib/course-data';
import { sendEmail, emailTemplates } from '@/lib/mail';
import { writeAuditLog } from '@/lib/audit';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const FormSchema = z.object({
  courseId: z.string().min(1, { message: 'กรุณาเลือกหลักสูตร' }),
  location: z.string().min(1, { message: 'กรุณากรอกสถานที่' }),
  status: z.enum(['เปิดรับสมัคร', 'เต็ม', 'เร็วๆ นี้', 'ยกเลิก']),
  startDate: z.string().min(1, { message: 'กรุณาเลือกวันที่เริ่มต้น' }),
  endDate: z.string().min(1, { message: 'กรุณาเลือกวันที่สิ้นสุด' }),
  instructorName: z.string().optional().or(z.literal('')),
  scheduleType: z.enum(['public', 'inhouse']).default('public'),
  clientId: z.string().optional().or(z.literal('')),
});

export type FormState = {
  errors?: {
    courseId?: string[];
    location?: string[];
    status?: string[];
    startDate?: string[];
    endDate?: string[];
    instructorName?: string[];
    scheduleType?: string[];
    clientId?: string[];
  };
  message?: string;
  success?: boolean;
  inhouseToken?: string; // returned after create/update for Inhouse schedules
};

async function getCourseTitle(courseId: string): Promise<string> {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) {
        throw new Error('ไม่พบข้อมูลหลักสูตรในระบบ');
    }
    const courseData = courseSnap.data() as Omit<Course, 'id'>;
    return courseData.title;
}

async function findOrCreateInstructor(name: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const instructorsRef = collection(db, 'instructors');
    const q = query(instructorsRef, where("name", "==", trimmedName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        await addDoc(instructorsRef, {
            name: trimmedName,
            title: "วิทยากร",
        });
        revalidatePath('/admin/instructors');
    }
}

// Helper to sanitize date string
const sanitizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0]; // Keep only yyyy-MM-dd
};

const formatThaiDate = (dateStr: string) => {
    try {
        return format(new Date(dateStr), 'd MMMM yyyy', { locale: th });
    } catch {
        return dateStr;
    }
};

/** Commits batched writes in chunks of 400 to stay under Firestore's 500-op limit */
async function commitInChunks(operations: Array<{ ref: any; data: any; type: 'update' | 'delete' }>) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const chunk = operations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
            if (op.type === 'update') batch.update(op.ref, op.data);
            else batch.delete(op.ref);
        });
        await batch.commit();
    }
}

export async function createSchedule(prevState: FormState, formData: FormData): Promise<FormState> {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = FormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
      success: false
    };
  }

  const { courseId, location, status, startDate, endDate, instructorName, scheduleType, clientId } = validatedFields.data;

  try {
    if (instructorName) {
        await findOrCreateInstructor(instructorName);
    }

    const courseTitle = await getCourseTitle(courseId);
    const isInhouse = scheduleType === 'inhouse';
    const inhouseToken = isInhouse ? nanoid(12) : undefined;

    await addDoc(collection(db, 'trainingSchedules'), {
      courseId,
      location,
      status,
      startDate: sanitizeDate(startDate),
      endDate: sanitizeDate(endDate),
      courseTitle,
      instructorName: instructorName || '',
      instructorTitle: 'วิทยากร',
      scheduleType: scheduleType || 'public',
      ...(clientId ? { clientId } : {}),
      ...(inhouseToken ? { inhouseToken } : {}),
      createdAt: new Date().toISOString(),
    });

    revalidatePath('/erp/schedule');
    revalidatePath('/courses');
    return { success: true, message: 'สร้างรอบอบรมเรียบร้อยแล้ว', inhouseToken };
  } catch (e) {
    console.error("Create Schedule Error:", e);
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

export async function updateSchedule(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = FormSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'กรุณาตรวจสอบข้อมูลอีกครั้ง',
            success: false
        };
    }

    const { courseId, location, status, startDate, endDate, instructorName, scheduleType, clientId } = validatedFields.data;
    const scheduleRef = doc(db, 'trainingSchedules', id);

    try {
        if (instructorName) {
            await findOrCreateInstructor(instructorName);
        }

        // Fetch old data to detect changes
        const oldSnap = await getDoc(scheduleRef);
        const oldData = oldSnap.exists() ? oldSnap.data() as TrainingSchedule : null;

        const courseTitle = await getCourseTitle(courseId);
        const newStartDate = sanitizeDate(startDate);
        const newEndDate = sanitizeDate(endDate);

        // Generate token if switching to Inhouse and not already set
        const isInhouse = scheduleType === 'inhouse';
        const existingToken = oldData?.inhouseToken;
        const inhouseToken = isInhouse && !existingToken ? nanoid(12) : existingToken;

        await updateDoc(scheduleRef, {
            courseId,
            location,
            status,
            startDate: newStartDate,
            endDate: newEndDate,
            courseTitle,
            instructorName: instructorName || '',
            scheduleType: scheduleType || 'public',
            clientId: clientId || null,
            ...(isInhouse && inhouseToken ? { inhouseToken } : {}),
            updatedAt: new Date().toISOString(),
        });

        // Cascade: update denormalized courseTitle in trainingRecords if course changed
        const courseTitleChanged = oldData && oldData.courseTitle !== courseTitle;
        if (courseTitleChanged) {
            const recordsQ = query(collection(db, 'trainingRecords'), where('scheduleId', '==', id));
            const recordsSnap = await getDocs(recordsQ);
            const ops = recordsSnap.docs.map(d => ({ ref: d.ref, data: { courseTitle }, type: 'update' as const }));
            if (ops.length > 0) await commitInChunks(ops);
        }

        // Cascade: send email if dates or status changed
        const datesChanged = oldData && (oldData.startDate !== newStartDate || oldData.endDate !== newEndDate);
        const statusChanged = oldData && oldData.status !== status;

        if (datesChanged || statusChanged) {
            const regsQ = query(collection(db, 'registrations'), where('scheduleId', '==', id), where('status', '!=', 'cancelled'));
            const regsSnap = await getDocs(regsQ);

            const emailPromises = regsSnap.docs.map(regDoc => {
                const reg = regDoc.data() as Registration;
                if (!reg.userEmail) return Promise.resolve();

                if (status === 'ยกเลิก') {
                    const tpl = emailTemplates.scheduleCancelled(
                        reg.userDisplayName || 'ลูกค้า',
                        courseTitle,
                        formatThaiDate(oldData?.startDate || ''),
                        'รอบอบรมถูกยกเลิก'
                    );
                    return sendEmail({ to: reg.userEmail, subject: tpl.subject, html: tpl.html });
                } else if (datesChanged) {
                    const tpl = emailTemplates.scheduleRescheduled(
                        reg.userDisplayName || 'ลูกค้า',
                        courseTitle,
                        formatThaiDate(oldData?.startDate || ''),
                        formatThaiDate(newStartDate),
                        location
                    );
                    return sendEmail({ to: reg.userEmail, subject: tpl.subject, html: tpl.html });
                }
                return Promise.resolve();
            });

            // Fire-and-forget: don't block the response if emails fail
            Promise.allSettled(emailPromises).catch(err => console.error("Bulk email error:", err));
        }

        revalidatePath('/erp/schedule');
        revalidatePath('/courses');
        return { success: true, message: 'อัปเดตข้อมูลเรียบร้อยแล้ว', inhouseToken: isInhouse ? inhouseToken : undefined };
    } catch (e) {
        console.error("Update Schedule Error:", e);
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
}

export async function generateInhouseToken(scheduleId: string): Promise<{ success: boolean; token?: string; message?: string }> {
    try {
        const token = nanoid(12);
        await updateDoc(doc(db, 'trainingSchedules', scheduleId), { inhouseToken: token });
        revalidatePath('/erp/schedule');
        return { success: true, token };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'ไม่สามารถสร้างลิงก์ได้' };
    }
}

export async function deleteSchedule(id: string) {
    try {
        const scheduleRef = doc(db, 'trainingSchedules', id);
        const scheduleSnap = await getDoc(scheduleRef);
        if (!scheduleSnap.exists()) {
            return { success: false, message: 'ไม่พบข้อมูลรอบอบรม' };
        }
        const scheduleData = scheduleSnap.data() as TrainingSchedule;

        // Check for active training records before allowing delete
        const activeRecordsQ = query(
            collection(db, 'trainingRecords'),
            where('scheduleId', '==', id),
            where('status', 'in', ['pending_verification', 'docs_verified'])
        );
        const activeRecordsSnap = await getDocs(activeRecordsQ);

        if (!activeRecordsSnap.empty) {
            return {
                success: false,
                message: `ไม่สามารถลบรอบอบรมได้ เนื่องจากมีผู้อบรมที่กำลังดำเนินการอยู่ ${activeRecordsSnap.size} ท่าน กรุณาจัดการผู้อบรมก่อนลบรอบ`
            };
        }

        // Fetch affected registrations to send cancellation emails
        const regsQ = query(collection(db, 'registrations'), where('scheduleId', '==', id), where('status', '!=', 'cancelled'));
        const regsSnap = await getDocs(regsQ);

        // Cascade: cancel all non-cancelled registrations using batched writes
        const regOps = regsSnap.docs.map(regDoc => ({
            ref: regDoc.ref,
            data: { status: 'cancelled', cancellationReason: 'รอบอบรมถูกลบออกจากระบบ' },
            type: 'update' as const,
        }));

        if (regOps.length > 0) {
            await commitInChunks(regOps);
        }

        // Delete the schedule itself
        await deleteDoc(scheduleRef);

        // Audit log (fire-and-forget)
        writeAuditLog({
            collectionName: 'trainingSchedules',
            documentId: id,
            action: 'delete',
            before: { courseTitle: scheduleData.courseTitle, startDate: scheduleData.startDate },
            performedBy: 'system',
            note: `ลบรอบอบรม — cascade ยกเลิก ${regsSnap.size} ใบสมัคร`,
        });

        // Send cancellation emails (fire-and-forget)
        const emailPromises = regsSnap.docs.map(regDoc => {
            const reg = regDoc.data() as Registration;
            if (!reg.userEmail) return Promise.resolve();
            const tpl = emailTemplates.scheduleCancelled(
                reg.userDisplayName || 'ลูกค้า',
                scheduleData.courseTitle,
                formatThaiDate(scheduleData.startDate),
                'รอบอบรมถูกลบออกจากระบบ'
            );
            return sendEmail({ to: reg.userEmail, subject: tpl.subject, html: tpl.html });
        });
        Promise.allSettled(emailPromises).catch(err => console.error("Cancellation email error:", err));

        revalidatePath('/erp/schedule');
        revalidatePath('/courses');
        return {
            success: true,
            message: `ลบรอบอบรมเรียบร้อยแล้ว${regsSnap.size > 0 ? ` (ยกเลิกใบสมัครที่เกี่ยวข้อง ${regsSnap.size} รายการ และส่งอีเมลแจ้งเตือนแล้ว)` : ''}`
        };
    } catch (e) {
        console.error("Delete Schedule Error:", e);
        return { success: false, message: e instanceof Error ? e.message : 'ไม่สามารถลบข้อมูลได้' };
    }
}
