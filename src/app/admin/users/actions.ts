
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { AppUser } from '@/lib/course-data';

const UserSchema = z.object({
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  displayName: z.string().min(1, { message: 'กรุณากรอกชื่อที่แสดง' }),
  role: z.enum(['admin', 'call_center', 'training_team', 'inspection_team'], {
    errorMap: () => ({ message: 'กรุณาเลือกบทบาท' }),
  }),
});

export type UserFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// Function to find a user by email, because we might not have the UID on creation
async function findUserByEmail(email: string): Promise<AppUser | null> {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const userDoc = querySnapshot.docs[0];
    return { uid: userDoc.id, ...userDoc.data() } as AppUser;
}

export async function createUser(prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const validatedFields = UserSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง' };
  }
  
  const data = validatedFields.data;

  try {
    // Check if user with this email already exists
    const existingUser = await findUserByEmail(data.email);
    if (existingUser) {
        return { message: `Database Error: มีผู้ใช้อีเมล ${data.email} อยู่ในระบบแล้ว` };
    }
    
    // Use the user's email as the document ID to prevent duplicates.
    // This assumes that the Auth UID will be added to this document upon first login via the useAuth context.
    const newUserDocRef = doc(db, 'users', data.email);
    const newUser: Omit<AppUser, 'uid' | 'photoURL'> = {
        email: data.email,
        displayName: data.displayName,
        role: data.role,
    };
    
    await setDoc(newUserDocRef, newUser, { merge: true });

  } catch (e) {
    return { message: `Database Error: ไม่สามารถสร้างผู้ใช้ได้. ${e instanceof Error ? e.message : ''}` };
  }

  revalidatePath('/admin/users');
  return { message: 'สร้างผู้ใช้สำเร็จ' };
}

export async function updateUser(uid: string, prevState: UserFormState, formData: FormData): Promise<UserFormState> {
    const validatedFields = UserSchema.omit({ email: true }).safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'ข้อมูลไม่ถูกต้อง' };
    }
    
    const data = validatedFields.data;
    const userRef = doc(db, 'users', uid);

    try {
        await updateDoc(userRef, {
            displayName: data.displayName,
            role: data.role,
        });
    } catch (e) {
        return { message: `Database Error: ไม่สามารถอัปเดตผู้ใช้ได้. ${e instanceof Error ? e.message : ''}` };
    }

    revalidatePath('/admin/users');
    return { message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' };
}

export async function deleteUser(uid: string) {
    try {
        await deleteDoc(doc(db, 'users', uid));
        revalidatePath('/admin/users');
        return { message: 'ลบผู้ใช้สำเร็จ' };
    } catch (e) {
        return { message: 'Database Error: ไม่สามารถลบผู้ใช้ได้' };
    }
}
