'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Course } from '@/lib/course-data';

const FormSchema = z.object({
  courseId: z.string().min(1, { message: 'กรุณาเลือกหลักสูตร' }),
  location: z.string().min(1, { message: 'กรุณากรอกสถานที่' }),
  status: z.enum(['เปิดรับสมัคร', 'เต็ม', 'เร็วๆ นี้', 'ยกเลิก']),
  startDate: z.string().min(1, { message: 'กรุณาเลือกวันที่เริ่มต้น' }),
  endDate: z.string().min(1, { message: 'กรุณาเลือกวันที่สิ้นสุด' }),
  instructorName: z.string().optional().or(z.literal('')),
});

export type FormState = {
  errors?: {
    courseId?: string[];
    location?: string[];
    status?: string[];
    startDate?: string[];
    endDate?: string[];
    instructorName?: string[];
  };
  message?: string;
  success?: boolean;
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

  const { courseId, location, status, startDate, endDate, instructorName } = validatedFields.data;

  try {
    if (instructorName) {
        await findOrCreateInstructor(instructorName);
    }
    
    const courseTitle = await getCourseTitle(courseId);
    
    await addDoc(collection(db, 'trainingSchedules'), {
      courseId,
      location,
      status,
      startDate: sanitizeDate(startDate),
      endDate: sanitizeDate(endDate),
      courseTitle,
      instructorName: instructorName || '',
      instructorTitle: 'วิทยากร',
      createdAt: new Date().toISOString(),
    });

    revalidatePath('/erp/schedule');
    revalidatePath('/courses');
    return { success: true, message: 'สร้างรอบอบรมเรียบร้อยแล้ว' };
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
    
    const { courseId, location, status, startDate, endDate, instructorName } = validatedFields.data;
    const scheduleRef = doc(db, 'trainingSchedules', id);

    try {
        if (instructorName) {
            await findOrCreateInstructor(instructorName);
        }
        
        const courseTitle = await getCourseTitle(courseId);
        
        await updateDoc(scheduleRef, {
            courseId,
            location,
            status,
            startDate: sanitizeDate(startDate),
            endDate: sanitizeDate(endDate),
            courseTitle,
            instructorName: instructorName || '',
            updatedAt: new Date().toISOString(),
        });

        revalidatePath('/erp/schedule');
        revalidatePath('/courses');
        return { success: true, message: 'อัปเดตข้อมูลเรียบร้อยแล้ว' };
    } catch (e) {
        console.error("Update Schedule Error:", e);
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
}

export async function deleteSchedule(id: string) {
    try {
        await deleteDoc(doc(db, 'trainingSchedules', id));
        revalidatePath('/erp/schedule');
        revalidatePath('/courses');
        return { success: true, message: 'ลบรอบอบรมเรียบร้อยแล้ว' };
    } catch (e) {
        console.error("Delete Schedule Error:", e);
        return { success: false, message: 'ไม่สามารถลบข้อมูลได้' };
    }
}
