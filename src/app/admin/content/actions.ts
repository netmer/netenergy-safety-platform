
'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { BlogPost } from '@/lib/blog-data';

const PostSchema = z.object({
  title: z.string().min(1, { message: 'กรุณากรอกชื่อบทความ' }),
  author: z.string().min(1, { message: 'กรุณากรอกชื่อผู้เขียน' }),
  category: z.string().min(1, { message: 'กรุณากรอกหมวดหมู่' }),
  excerpt: z.string().min(1, { message: 'กรุณากรอกเนื้อหาย่อ' }),
  imageUrl: z.string().min(1, { message: 'ไม่พบ URL ของรูปภาพ' }),
  hint: z.string().optional(),
});

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

function createSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
}

async function deleteImage(url: string) {
    if (!url || !url.startsWith('https://firebasestorage.googleapis.com')) return;
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.error("Failed to delete old image:", error);
        }
    }
}

export async function createBlogPost(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    imageUrl: formData.get('imageUrl'),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
  }
  
  const data = validatedFields.data;
  const slug = createSlug(data.title);
  const postRef = doc(db, 'blogPosts', slug);

  const docSnap = await getDoc(postRef);
  if (docSnap.exists()) {
    return { message: `เกิดข้อผิดพลาด: มีบทความที่ใช้ slug '${slug}' นี้อยู่แล้ว`, success: false };
  }

  try {
    const newPostData: Omit<BlogPost, 'slug'> = {
        ...data,
        image: data.imageUrl,
        date: new Date().toISOString(),
        hint: data.hint || 'blog article',
    };

    await setDoc(postRef, newPostData);

    revalidatePath('/admin/content');
    revalidatePath('/blog');
    return { message: 'สร้างบทความสำเร็จ', success: true };
  } catch (e) {
    return { message: 'ไม่สามารถบันทึกบทความได้', success: false };
  }
}

export async function updateBlogPost(slug: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = PostSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        imageUrl: formData.get('imageUrl'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง', success: false };
    }
    
    const data = validatedFields.data;
    const postRef = doc(db, 'blogPosts', slug);

    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) throw new Error("ไม่พบบทความ");
        const oldImageUrl = postSnap.data().image;

        await setDoc(postRef, {
            ...data,
            image: data.imageUrl,
            hint: data.hint || 'blog article',
        }, { merge: true });

        if (oldImageUrl && oldImageUrl !== data.imageUrl) {
            await deleteImage(oldImageUrl);
        }

        revalidatePath('/admin/content');
        revalidatePath('/blog');
        revalidatePath(`/blog/${slug}`);
        return { message: 'อัปเดตบทความสำเร็จ', success: true };
    } catch (e) {
        return { message: 'ไม่สามารถอัปเดตบทความได้', success: false };
    }
}

export async function deleteBlogPost(slug: string) {
    try {
        const postRef = doc(db, 'blogPosts', slug);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) await deleteImage(postSnap.data().image);
        await deleteDoc(postRef);
        revalidatePath('/admin/content');
        revalidatePath('/blog');
        return { success: true, message: 'ลบบทความสำเร็จ' };
    } catch (e) {
        return { success: false, message: 'ไม่สามารถลบบทความได้' };
    }
}
