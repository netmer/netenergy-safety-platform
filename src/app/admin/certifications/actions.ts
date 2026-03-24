'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { Certification } from '@/lib/course-data';

const CertificationSchema = z.object({
  title: z.string().min(1, { message: 'กรุณากรอกชื่อใบรับรอง' }),
  issuer: z.string().min(1, { message: 'กรุณากรอกชื่อผู้ออกใบรับรอง' }),
  hint: z.string().optional(),
});

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

/**
 * Robust server-side file upload engine using Uint8Array for reliability in Server Actions.
 */
async function serverUploadFile(file: File, folder: string): Promise<string> {
    if (!file || file.size === 0) return '';
    try {
        const bytes = await file.arrayBuffer();
        const buffer = new Uint8Array(bytes);
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const fileRef = ref(storage, `${folder}/${fileName}`);
        
        const metadata = { 
            contentType: file.type || 'application/octet-stream' 
        };
        
        await uploadBytes(fileRef, buffer, metadata);
        return await getDownloadURL(fileRef);
    } catch (error: any) {
        console.error("Server upload error:", error);
        throw new Error(`ไม่สามารถอัปโหลดไฟล์ไปยัง Storage ได้: ${error.message || 'Unknown Storage Error'}`);
    }
}

async function deleteFile(url: string) {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return;
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.error("Failed to delete file:", error);
        }
    }
}

export async function createCertification(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = CertificationSchema.safeParse({
    title: formData.get('title'),
    issuer: formData.get('issuer'),
    hint: formData.get('hint'),
  });

  if (!validatedFields.success) {
    return { 
        errors: validatedFields.error.flatten().fieldErrors, 
        message: 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
        success: false 
    };
  }
  
  const { title, issuer, hint } = validatedFields.data;
  const imageFile = formData.get('image') as File;

  try {
    if (!imageFile || imageFile.size === 0) {
        return { message: 'กรุณาอัปโหลดรูปภาพหรือไฟล์ PDF', success: false };
    }

    const imageUrl = await serverUploadFile(imageFile, 'certifications');

    await addDoc(collection(db, 'certifications'), {
      title,
      issuer,
      image: imageUrl,
      hint: hint || 'certification file',
      orderIndex: 0,
    });

    revalidatePath('/admin/certifications');
    revalidatePath('/');
    return { message: 'เพิ่มใบรับรองสำเร็จ', success: true };
  } catch (e) {
    return { message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', success: false };
  }
}

export async function updateCertification(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = CertificationSchema.safeParse({
        title: formData.get('title'),
        issuer: formData.get('issuer'),
        hint: formData.get('hint'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
    }
    
    const { title, issuer, hint } = validatedFields.data;
    const imageFile = formData.get('image') as File;

    try {
        const docRef = doc(db, 'certifications', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) throw new Error("ไม่พบข้อมูลใบรับรอง");

        const oldImageUrl = docSnap.data().image;
        let finalImageUrl = oldImageUrl;

        if (imageFile && imageFile.size > 0) {
            finalImageUrl = await serverUploadFile(imageFile, 'certifications');
            if (oldImageUrl) await deleteFile(oldImageUrl);
        }

        await updateDoc(docRef, {
            title,
            issuer,
            image: finalImageUrl,
            hint: hint || 'certification file',
        });

        revalidatePath('/admin/certifications');
        revalidatePath('/');
        return { message: 'อัปเดตใบรับรองสำเร็จ', success: true };
    } catch (e) {
        return { message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', success: false };
    }
}

export async function deleteCertification(certification: Certification) {
    try {
        if (certification.image) await deleteFile(certification.image);
        await deleteDoc(doc(db, 'certifications', certification.id));
        revalidatePath('/admin/certifications');
        revalidatePath('/');
        return { success: true, message: 'ลบใบรับรองสำเร็จ' };
    } catch (e) {
        return { success: false, message: 'ไม่สามารถลบใบรับรองได้' };
    }
}

export async function updateCertificationOrder(id: string, orderIndex: number) {
  try {
    await updateDoc(doc(db, 'certifications', id), { orderIndex: Number(orderIndex) });
    revalidatePath('/admin/certifications');
    revalidatePath('/');
    return { success: true, message: 'อัปเดตลำดับสำเร็จ' };
  } catch (e) {
    return { success: false, message: 'ไม่สามารถอัปเดตลำดับได้' };
  }
}
