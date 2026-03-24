'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { CertificateTemplate } from '@/lib/course-data';

const TemplateSchema = z.object({
  name: z.string().min(1, { message: 'กรุณากรอกชื่อแม่แบบ' }),
  hint: z.string().optional(),
});

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

async function uploadImage(file: File): Promise<string> {
    try {
        const storageRef = ref(storage, `certificate-templates/${Date.now()}-${file.name}`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const snapshot = await uploadBytes(storageRef, buffer);
        return getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Template image upload error:", error);
        throw new Error("ไม่สามารถอัปโหลดพื้นหลังแม่แบบได้");
    }
}

export async function createTemplate(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = TemplateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง' };
  }
  
  const { name, hint } = validatedFields.data;
  const imageFile = formData.get('image') as File;

  if (!imageFile || imageFile.size === 0) {
      return { message: 'กรุณาอัปโหลดรูปภาพพื้นหลัง' };
  }

  try {
    const imageUrl = await uploadImage(imageFile);

    await addDoc(collection(db, 'certificateTemplates'), {
      name,
      backgroundImageUrl: imageUrl,
      hint: hint || 'certificate background',
    });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return { message: `Database Error: ไม่สามารถสร้างแม่แบบได้. ${errorMessage}` };
  }

  revalidatePath('/admin/templates');
  revalidatePath('/admin/courses');
  return { message: 'สร้างแม่แบบสำเร็จ' };
}


export async function updateTemplate(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = TemplateSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง' };
    }
    
    const { name, hint } = validatedFields.data;
    const imageFile = formData.get('image') as File;

    try {
        const dataToUpdate: Partial<Omit<CertificateTemplate, 'id'>> = {
            name,
            hint: hint || 'certificate background',
        };

        if (imageFile && imageFile.size > 0) {
            dataToUpdate.backgroundImageUrl = await uploadImage(imageFile);
            // Consider deleting the old image from storage here
        }

        await updateDoc(doc(db, 'certificateTemplates', id), dataToUpdate);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return { message: `Database Error: ไม่สามารถอัปเดตแม่แบบได้. ${errorMessage}` };
    }

    revalidatePath('/admin/templates');
    revalidatePath('/admin/courses');
    return { message: 'อัปเดตแม่แบบสำเร็จ' };
}


export async function deleteTemplate(template: CertificateTemplate) {
    try {
        // Delete the image from Storage first
        if (template.backgroundImageUrl && template.backgroundImageUrl.includes('firebasestorage')) {
            try {
                const fileRef = ref(storage, template.backgroundImageUrl);
                await deleteObject(fileRef);
            } catch (storageError: any) {
                // If the object doesn't exist, we can ignore the error and proceed
                if (storageError.code !== 'storage/object-not-found') {
                    throw storageError;
                }
            }
        }
        
        // Then delete the document from Firestore
        await deleteDoc(doc(db, 'certificateTemplates', template.id));

        revalidatePath('/admin/templates');
        revalidatePath('/admin/courses');
        return { success: true, message: 'ลบแม่แบบสำเร็จ' };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: `Database Error: ไม่สามารถลบแม่แบบได้. ${errorMessage}` };
    }
}