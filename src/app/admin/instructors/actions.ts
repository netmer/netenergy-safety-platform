
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const InstructorSchema = z.object({
  name: z.string().trim().min(1, { message: 'กรุณากรอกชื่อวิทยากร' }),
  title: z.string().trim().min(1, { message: 'กรุณากรอกตำแหน่ง' }),
});

export type InstructorFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success: boolean;
};

export async function createInstructor(prevState: InstructorFormState, formData: FormData): Promise<InstructorFormState> {
  const validatedFields = InstructorSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
  }
  
  const { name, title } = validatedFields.data;
  
  try {
    const instructorsRef = collection(db, 'instructors');
    const q = query(instructorsRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return { message: `Database Error: มีวิทยากรชื่อ "${name}" อยู่ในระบบแล้ว`, success: false };
    }

    await addDoc(collection(db, 'instructors'), { name, title });

  } catch (e) {
    return { message: `Database Error: ไม่สามารถสร้างข้อมูลวิทยากรได้. ${e instanceof Error ? e.message : ''}`, success: false };
  }

  revalidatePath('/admin/instructors');
  revalidatePath('/erp/schedule');
  return { message: 'สร้างข้อมูลวิทยากรสำเร็จ', success: true };
}

export async function updateInstructor(id: string, prevState: InstructorFormState, formData: FormData): Promise<InstructorFormState> {
    const validatedFields = InstructorSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
    }
    
    const { name, title } = validatedFields.data;
    const instructorRef = doc(db, 'instructors', id);

    try {
        const instructorsRef = collection(db, 'instructors');
        const q = query(instructorsRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);

        const isDuplicate = querySnapshot.docs.some(doc => doc.id !== id);

        if (isDuplicate) {
             return { message: `Database Error: มีวิทยากรชื่อ "${name}" อยู่ในระบบแล้ว`, success: false };
        }
        
        await updateDoc(instructorRef, { name, title });

    } catch (e) {
        return { message: `Database Error: ไม่สามารถอัปเดตข้อมูลวิทยากรได้. ${e instanceof Error ? e.message : ''}`, success: false };
    }

    revalidatePath('/admin/instructors');
    revalidatePath('/erp/schedule');
    return { message: 'อัปเดตข้อมูลวิทยากรสำเร็จ', success: true };
}

export async function deleteInstructor(id: string): Promise<{ success: boolean; message: string }> {
    try {
        await deleteDoc(doc(db, 'instructors', id));
        revalidatePath('/admin/instructors');
        revalidatePath('/erp/schedule');
        return { success: true, message: 'ลบข้อมูลวิทยากรสำเร็จ' };
    } catch (e) {
        return { success: false, message: 'Database Error: ไม่สามารถลบข้อมูลวิทยากรได้' };
    }
}
