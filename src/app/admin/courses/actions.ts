'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { Course, CourseCategory, CourseType } from '@/lib/course-data';

const CourseFormSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().min(1, { message: 'กรุณากรอกชื่อหลักสูตร' }),
  shortName: z.string().optional().nullable(),
  description: z.string().min(1, { message: 'กรุณากรอกคำอธิบาย' }),
  categoryId: z.string().min(1, { message: 'กรุณาเลือกหมวดหมู่' }),
  type: z.array(z.string()).default([]), // Changed to array
  tags: z.string().transform((val) => val.split(',').map((tag) => tag.trim()).filter(Boolean)),
  hint: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  validityYears: z.coerce.number().optional().nullable(),
  registrationFormId: z.string().optional().nullable(),
  certificateTemplateId: z.string().optional().nullable(),
  objectives: z.string().optional().nullable().transform((val) => (val ? val.split('\n').map((item) => item.trim()).filter(Boolean) : [])),
  topics: z.string().optional().nullable().transform((val) => (val ? val.split('\n').map((item) => item.trim()).filter(Boolean) : [])),
  agenda: z.string().optional().nullable().transform((val) => (val ? val.split('\n').map((item) => item.trim()).filter(Boolean) : [])),
  benefits: z.string().optional().nullable().transform((val) => (val ? val.split('\n').map((item) => item.trim()).filter(Boolean) : [])),
  qualifications: z.string().optional().nullable().transform((val) => (val ? val.split('\n').map((item) => item.trim()).filter(Boolean) : [])),
});

const CategoryFormSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().min(1, { message: 'กรุณากรอกชื่อหมวดหมู่' }),
  description: z.string().optional().nullable(),
  hint: z.string().optional().nullable(),
  parentId: z.string().optional().nullable().transform(v => v === 'none' ? null : v), // Added parentId
});

export type FormState = {
  errors: Record<string, string[]>;
  message: string;
  success: boolean;
};

/**
 * Robust server-side file upload engine.
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
        throw new Error(`ไม่สามารถอัปโหลดไฟล์ได้: ${error.message || 'Unknown Storage Error'}`);
    }
}

async function deleteImage(url: string) {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return;
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.error("Failed to delete image:", error);
        }
    }
}

export async function submitCourse(prevState: FormState, formData: FormData): Promise<FormState> {
  // Extract all "type" values manually because Object.fromEntries only takes the last one
  const types = formData.getAll('type') as string[];
  
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = CourseFormSchema.safeParse({
    ...rawData,
    type: types // Use the manually collected types array
  });

  if (!validatedFields.success) return { 
    errors: JSON.parse(JSON.stringify(validatedFields.error.flatten().fieldErrors)), 
    message: 'ข้อมูลไม่ถูกต้อง', 
    success: false 
  };
  
  const data = validatedFields.data;
  const imageFile = formData.get('image') as File;
  const id = formData.get('id') as string;

  try {
    if (id) {
        // Update
        const courseRef = doc(db, 'courses', id);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) throw new Error("ไม่พบหลักสูตร");

        const oldImageUrl = courseSnap.data().image;
        let finalImageUrl = oldImageUrl;

        if (imageFile && imageFile.size > 0) {
            finalImageUrl = await serverUploadFile(imageFile, 'courses');
            if (oldImageUrl) await deleteImage(oldImageUrl);
        }

        const { id: _, ...updateData } = data;
        await updateDoc(courseRef, {
            ...updateData,
            image: finalImageUrl,
            hint: data.hint || 'training course'
        });
    } else {
        // Create
        let imageUrl = 'https://placehold.co/600x400.png';
        if (imageFile && imageFile.size > 0) {
            imageUrl = await serverUploadFile(imageFile, 'courses');
        }

        const { id: _, ...createData } = data;
        await addDoc(collection(db, 'courses'), {
            ...createData,
            orderIndex: 0,
            image: imageUrl,
            hint: data.hint || 'training course',
        });
    }
    
    // Purge caches
    revalidatePath('/', 'layout');
    revalidatePath('/admin/courses');
    revalidatePath('/courses');
    revalidatePath('/courses/[categoryId]', 'page');
    revalidatePath('/courses/course/[courseId]', 'page');
    
    return { errors: {}, message: id ? 'อัปเดตหลักสูตรสำเร็จ' : 'สร้างหลักสูตรสำเร็จ', success: true };
  } catch (e) {
    return { errors: {}, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', success: false };
  }
}

export async function submitCategory(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = CategoryFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { 
    errors: JSON.parse(JSON.stringify(validatedFields.error.flatten().fieldErrors)), 
    message: 'ข้อมูลไม่ถูกต้อง', 
    success: false 
  };
  
  const data = validatedFields.data;
  const imageFile = formData.get('image') as File;
  const id = formData.get('id') as string;

  try {
    if (id) {
        // Update
        const categoryRef = doc(db, 'courseCategories', id);
        const categorySnap = await getDoc(categoryRef);
        if (!categorySnap.exists()) throw new Error("ไม่พบหมวดหมู่");

        const oldImageUrl = categorySnap.data().image;
        let finalImageUrl = oldImageUrl;

        if (imageFile && imageFile.size > 0) {
            finalImageUrl = await serverUploadFile(imageFile, 'categories');
            if (oldImageUrl) await deleteImage(oldImageUrl);
        }

        await updateDoc(categoryRef, {
            title: data.title,
            description: data.description || '',
            image: finalImageUrl,
            hint: data.hint || 'training category',
            parentId: data.parentId || null
        });
    } else {
        // Create
        let imageUrl = 'https://placehold.co/600x400.png';
        if (imageFile && imageFile.size > 0) {
            imageUrl = await serverUploadFile(imageFile, 'categories');
        }

        await addDoc(collection(db, 'courseCategories'), {
            title: data.title,
            description: data.description || '',
            image: imageUrl,
            hint: data.hint || 'training category',
            orderIndex: 0,
            parentId: data.parentId || null
        });
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin/courses');
    revalidatePath('/courses');
    revalidatePath('/courses/[categoryId]', 'page');
    
    return { errors: {}, message: id ? 'อัปเดตหมวดหมู่สำเร็จ' : 'สร้างหมวดหมู่สำเร็จ', success: true };
  } catch (e) {
    return { errors: {}, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกหมวดหมู่', success: false };
  }
}

export async function createType(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string;
  if (!name) return { errors: { name: ['กรุณากรอกชื่อประเภท'] }, message: 'ข้อมูลไม่ถูกต้อง', success: false };

  try {
    await addDoc(collection(db, 'courseTypes'), { name });
    revalidatePath('/admin/courses');
    return { errors: {}, message: 'สร้างประเภทหลักสูตรสำเร็จ', success: true };
  } catch (e) {
    return { errors: {}, message: 'เกิดข้อผิดพลาดในการบันทึกประเภทหลักสูตร', success: false };
  }
}

export async function deleteType(id: string) {
  try {
    await deleteDoc(doc(db, 'courseTypes', id));
    revalidatePath('/admin/courses');
    return { success: true, message: 'ลบประเภทหลักสูตรสำเร็จ' };
  } catch (e) {
    return { success: false, message: 'ไม่สามารถลบประเภทหลักสูตรได้' };
  }
}

export async function deleteCourse(id: string) {
    try {
        const courseRef = doc(db, 'courses', id);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) await deleteImage(courseSnap.data().image);
        await deleteDoc(courseRef);
        
        revalidatePath('/', 'layout');
        revalidatePath('/admin/courses');
        revalidatePath('/courses');
        
        return { success: true, message: 'ลบหลักสูตรสำเร็จ' };
    } catch (e) { return { success: false, message: 'ไม่สามารถลบหลักสูตรได้' }; }
}

export async function deleteCategory(id: string) {
    try {
        const categoryRef = doc(db, 'courseCategories', id);
        const categorySnap = await getDoc(categoryRef);
        if (categorySnap.exists()) await deleteImage(categorySnap.data().image);
        await deleteDoc(categoryRef);
        
        revalidatePath('/', 'layout');
        revalidatePath('/admin/courses');
        revalidatePath('/courses');
        
        return { success: true, message: 'ลบหมวดหมู่สำเร็จ' };
    } catch (e) { return { success: false, message: 'ไม่สามารถลบหมวดหมู่ได้' }; }
}

export async function updateCourseOrder(id: string, order: number) {
    try { 
        await updateDoc(doc(db, 'courses', id), { orderIndex: Number(order) }); 
        revalidatePath('/', 'layout');
        revalidatePath('/admin/courses'); 
        revalidatePath('/courses');
        return { success: true, message: 'อัปเดตลำดับสำเร็จ' }; 
    }
    catch (e) { return { success: false, message: 'ล้มเหลว' }; }
}

export async function updateCategoryOrder(id: string, order: number) {
    try { 
        await updateDoc(doc(db, 'courseCategories', id), { orderIndex: Number(order) }); 
        revalidatePath('/', 'layout');
        revalidatePath('/admin/courses'); 
        revalidatePath('/courses');
        return { success: true, message: 'อัปเดตลำดับสำเร็จ' }; 
    }
    catch (e) { return { success: false, message: 'ล้มเหลว' }; }
}
