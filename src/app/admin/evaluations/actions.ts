'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { EvaluationTemplate } from '@/lib/course-data';
import { makeDefaultEvaluationTemplate } from '@/lib/evaluation-utils';

export async function createEvaluationTemplate(
    courseId: string,
    courseTitle: string,
    createdBy: string,
): Promise<{ success: boolean; message: string; id?: string }> {
    try {
        const courseSnap = await getDoc(doc(db, 'courses', courseId));
        if (!courseSnap.exists()) return { success: false, message: 'ไม่พบหลักสูตร' };
        const course = courseSnap.data();
        if (course.evaluationTemplateId) return { success: false, message: 'หลักสูตรนี้มีแบบประเมินอยู่แล้ว' };

        const data = makeDefaultEvaluationTemplate(courseId, courseTitle, createdBy);
        const ref = await addDoc(collection(db, 'evaluationTemplates'), data);
        await updateDoc(doc(db, 'courses', courseId), { evaluationTemplateId: ref.id });
        revalidatePath('/admin/evaluations');
        revalidatePath('/admin/courses');
        return { success: true, message: 'สร้างแบบประเมินสำเร็จ', id: ref.id };
    } catch (e) {
        return { success: false, message: `เกิดข้อผิดพลาด: ${e instanceof Error ? e.message : e}` };
    }
}

export async function updateEvaluationTemplate(
    id: string,
    data: Partial<Omit<EvaluationTemplate, 'id' | 'createdAt'>>,
): Promise<{ success: boolean; message: string }> {
    try {
        await updateDoc(doc(db, 'evaluationTemplates', id), {
            ...data,
            updatedAt: new Date().toISOString(),
        });
        revalidatePath('/admin/evaluations');
        revalidatePath(`/admin/evaluations/${id}`);
        return { success: true, message: 'บันทึกแบบประเมินสำเร็จ' };
    } catch (e) {
        return { success: false, message: `เกิดข้อผิดพลาด: ${e instanceof Error ? e.message : e}` };
    }
}

export async function deleteEvaluationTemplate(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const snap = await getDoc(doc(db, 'evaluationTemplates', id));
        if (!snap.exists()) return { success: false, message: 'ไม่พบแบบประเมิน' };
        const data = snap.data() as EvaluationTemplate;
        await deleteDoc(doc(db, 'evaluationTemplates', id));
        await updateDoc(doc(db, 'courses', data.courseId), { evaluationTemplateId: null });
        revalidatePath('/admin/evaluations');
        revalidatePath('/admin/courses');
        return { success: true, message: 'ลบแบบประเมินสำเร็จ' };
    } catch (e) {
        return { success: false, message: `เกิดข้อผิดพลาด: ${e instanceof Error ? e.message : e}` };
    }
}
