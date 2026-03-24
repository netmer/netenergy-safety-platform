'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';

const ClientSchema = z.object({
  companyName: z.string().min(1, { message: 'กรุณากรอกชื่อบริษัท' }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  showOnHome: z.string().optional(),
  hint: z.string().optional(),
});

export type ClientFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

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
        throw new Error(`ไม่สามารถอัปโหลดไฟล์ได้: ${error.message}`);
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

export async function createClient(prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const validatedFields = ClientSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
  }
  
  const data = validatedFields.data;
  const logoFile = formData.get('logo') as File;

  try {
    let logoUrl = '';
    if (logoFile && logoFile.size > 0) {
        logoUrl = await serverUploadFile(logoFile, 'client-logos');
    }

    await addDoc(collection(db, 'clients'), {
      ...data,
      showOnHome: data.showOnHome === 'on',
      logo: logoUrl,
      createdAt: new Date().toISOString(),
    });

    revalidatePath('/admin/clients');
    revalidatePath('/');
    return { message: 'สร้างข้อมูลลูกค้าสำเร็จ', success: true };
  } catch (e) {
    return { message: `Database Error: ${e instanceof Error ? e.message : 'ไม่สามารถสร้างข้อมูลได้'}`, success: false };
  }
}

export async function updateClient(id: string, prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
    const validatedFields = ClientSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
    }
    
    const data = validatedFields.data;
    const logoFile = formData.get('logo') as File;

    try {
        const clientRef = doc(db, 'clients', id);
        const clientSnap = await getDoc(clientRef);
        if (!clientSnap.exists()) throw new Error("ไม่พบข้อมูลลูกค้า");

        const oldLogoUrl = clientSnap.data().logo;
        let finalLogoUrl = oldLogoUrl;

        if (logoFile && logoFile.size > 0) {
            finalLogoUrl = await serverUploadFile(logoFile, 'client-logos');
            if (oldLogoUrl) await deleteFile(oldLogoUrl);
        }

        await updateDoc(clientRef, {
            ...data,
            showOnHome: data.showOnHome === 'on',
            logo: finalLogoUrl,
        });

        revalidatePath('/admin/clients');
        revalidatePath('/');
        return { message: 'อัปเดตข้อมูลลูกค้าสำเร็จ', success: true };
    } catch (e) {
        return { message: `Database Error: ${e instanceof Error ? e.message : 'ไม่สามารถอัปเดตข้อมูลได้'}`, success: false };
    }
}

export async function deleteClient(id: string) {
    try {
        const clientRef = doc(db, 'clients', id);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists() && clientSnap.data().logo) {
            await deleteFile(clientSnap.data().logo);
        }
        await deleteDoc(clientRef);
        revalidatePath('/admin/clients');
        revalidatePath('/');
        return { success: true, message: 'ลบข้อมูลลูกค้าสำเร็จ' };
    } catch (e) {
        return { success: false, message: 'Database Error: ไม่สามารถลบข้อมูลลูกค้าได้' };
    }
}
