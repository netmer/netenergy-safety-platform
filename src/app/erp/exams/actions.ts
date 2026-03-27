'use server';

import { db } from '@/lib/firebase';
import {
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
    query, where, orderBy
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { ExamTemplate } from '@/lib/course-data';

export async function getAllExamTemplates(): Promise<ExamTemplate[]> {
    const snap = await getDocs(query(collection(db, 'examTemplates'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamTemplate);
}

export async function getExamTemplate(id: string): Promise<ExamTemplate | null> {
    const snap = await getDoc(doc(db, 'examTemplates', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ExamTemplate;
}

export async function getExamTemplateForCourse(courseId: string): Promise<ExamTemplate | null> {
    const snap = await getDocs(query(collection(db, 'examTemplates'), where('courseId', '==', courseId)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as ExamTemplate;
}

export async function createExamTemplate(
    data: Omit<ExamTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; message: string; id?: string }> {
    try {
        const now = new Date().toISOString();
        const ref = await addDoc(collection(db, 'examTemplates'), {
            ...data,
            createdAt: now,
            updatedAt: now,
        });
        // Also update the course document to link this template
        await updateDoc(doc(db, 'courses', data.courseId), { examTemplateId: ref.id });
        revalidatePath('/erp/exams');
        revalidatePath('/admin/courses');
        return { success: true, message: 'สร้างแบบทดสอบสำเร็จ', id: ref.id };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: `เกิดข้อผิดพลาด: ${error}` };
    }
}

export async function updateExamTemplate(
    id: string,
    data: Partial<Omit<ExamTemplate, 'id' | 'createdAt'>>
): Promise<{ success: boolean; message: string }> {
    try {
        await updateDoc(doc(db, 'examTemplates', id), {
            ...data,
            updatedAt: new Date().toISOString(),
        });
        revalidatePath('/erp/exams');
        revalidatePath(`/erp/exams/${id}`);
        return { success: true, message: 'บันทึกแบบทดสอบสำเร็จ' };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: `เกิดข้อผิดพลาด: ${error}` };
    }
}

export async function duplicateExamTemplate(
    sourceId: string,
    targetCourseId: string,
    createdBy: string
): Promise<{ success: boolean; message: string; id?: string }> {
    try {
        const sourceSnap = await getDoc(doc(db, 'examTemplates', sourceId));
        if (!sourceSnap.exists()) return { success: false, message: 'ไม่พบแบบทดสอบต้นฉบับ' };

        const source = sourceSnap.data() as ExamTemplate;

        // Check target course doesn't already have a template
        const targetCourseSnap = await getDoc(doc(db, 'courses', targetCourseId));
        if (!targetCourseSnap.exists()) return { success: false, message: 'ไม่พบหลักสูตรปลายทาง' };
        const targetCourse = targetCourseSnap.data();
        if (targetCourse.examTemplateId) return { success: false, message: 'หลักสูตรนี้มีแบบทดสอบอยู่แล้ว' };

        const now = new Date().toISOString();
        const ref = await addDoc(collection(db, 'examTemplates'), {
            ...source,
            id: undefined,
            name: `${source.name} (สำเนา)`,
            courseId: targetCourseId,
            courseTitle: targetCourse.title ?? targetCourseId,
            createdAt: now,
            updatedAt: now,
            createdBy,
        });

        await updateDoc(doc(db, 'courses', targetCourseId), { examTemplateId: ref.id });
        revalidatePath('/erp/exams');
        revalidatePath('/admin/exams');
        revalidatePath('/admin/courses');
        return { success: true, message: 'ทำสำเนาแบบทดสอบสำเร็จ', id: ref.id };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: `เกิดข้อผิดพลาด: ${error}` };
    }
}

export async function deleteExamTemplate(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const snap = await getDoc(doc(db, 'examTemplates', id));
        if (!snap.exists()) return { success: false, message: 'ไม่พบแบบทดสอบ' };
        const data = snap.data() as ExamTemplate;
        await deleteDoc(doc(db, 'examTemplates', id));
        // Remove the link from the course
        await updateDoc(doc(db, 'courses', data.courseId), { examTemplateId: null });
        revalidatePath('/erp/exams');
        revalidatePath('/admin/courses');
        return { success: true, message: 'ลบแบบทดสอบสำเร็จ' };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: `เกิดข้อผิดพลาด: ${error}` };
    }
}
