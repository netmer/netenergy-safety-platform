'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { RegistrationForm } from '@/lib/course-data';

// Zod schema for form validation, ensuring 'name' and 'fields' are present.
const FormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อแบบฟอร์ม'),
  description: z.string().optional(),
  fields: z.array(z.any()), // Basic validation, can be improved with a detailed field schema
});

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// Action to create a new registration form
export async function createForm(prevState: FormState, formData: FormData): Promise<FormState> {
  const formJson = formData.get('formJson') as string;
  if (!formJson) {
    return { message: 'เกิดข้อผิดพลาด: ไม่พบข้อมูลฟอร์ม' };
  }
  
  const parsedData = JSON.parse(formJson);
  const validatedFields = FormSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง' };
  }

  try {
    await addDoc(collection(db, 'registrationForms'), {
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      fields: validatedFields.data.fields
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "เกิดข้อผิดพลาดที่ไม่รู้จัก";
    return { message: `Database Error: ไม่สามารถสร้างแบบฟอร์มได้. ${error}` };
  }

  revalidatePath('/admin/forms');
  revalidatePath('/erp/forms');
  return { message: 'สร้างแบบฟอร์มสำเร็จ' };
}

// Action to update an existing registration form
export async function updateForm(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const formJson = formData.get('formJson') as string;
    if (!formJson) {
        return { message: 'เกิดข้อผิดพลาด: ไม่พบข้อมูลฟอร์ม' };
    }
    
    const parsedData = JSON.parse(formJson);
    const validatedFields = FormSchema.safeParse(parsedData);

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง' };
    }

    const formRef = doc(db, 'registrationForms', id);

    try {
        await updateDoc(formRef, {
             name: validatedFields.data.name,
            description: validatedFields.data.description,
            fields: validatedFields.data.fields
        });
    } catch (e) {
        const error = e instanceof Error ? e.message : "เกิดข้อผิดพลาดที่ไม่รู้จัก";
        return { message: `Database Error: ไม่สามารถอัปเดตแบบฟอร์มได้. ${error}` };
    }

    revalidatePath('/admin/forms');
    revalidatePath('/erp/forms');
    revalidatePath('/admin/courses');
    return { message: 'อัปเดตแบบฟอร์มสำเร็จ' };
}

// Action to duplicate an existing registration form
export async function duplicateForm(id: string) {
    try {
        const formRef = doc(db, 'registrationForms', id);
        const formSnap = await getDoc(formRef);
        
        if (!formSnap.exists()) {
            return { success: false, message: 'ไม่พบฟอร์มต้นฉบับ' };
        }

        const originalData = formSnap.data() as RegistrationForm;
        
        // Create new copy with " (สำเนา)" suffix
        await addDoc(collection(db, 'registrationForms'), {
            name: `${originalData.name} (สำเนา)`,
            description: originalData.description || '',
            fields: originalData.fields || []
        });

        revalidatePath('/admin/forms');
        revalidatePath('/erp/forms');
        return { success: true, message: 'ทำสำเนาแบบฟอร์มเรียบร้อยแล้ว' };
    } catch (e) {
        console.error("Duplicate form error:", e);
        return { success: false, message: 'Database Error: ไม่สามารถทำสำเนาได้' };
    }
}

// Action to delete a registration form
export async function deleteForm(id: string) {
    try {
        await deleteDoc(doc(db, 'registrationForms', id));
        revalidatePath('/admin/forms');
        revalidatePath('/erp/forms');
        revalidatePath('/admin/courses');
        return { message: 'ลบแบบฟอร์มสำเร็จ' };
    } catch (e) {
        return { message: 'Database Error: ไม่สามารถลบแบบฟอร์มได้' };
    }
}
