'use server';

import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, writeBatch, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, orderBy, startAfter, limit, DocumentData, documentId } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Registration, AttendeeStatus, RegistrationFormField, AttendeeAttendanceStatus, AdditionalDoc, AttendeeData, TrainingRecord, Course } from '@/lib/course-data';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {nanoid} from 'nanoid';
import { format, addYears } from 'date-fns';
import { z } from 'zod';

const PAGE_SIZE = 30;

export async function getPaginatedTrainingRecords({
    scheduleId,
    status,
    lastVisibleId,
}: {
    scheduleId: string;
    status: 'all' | 'pending' | 'verified';
    lastVisibleId?: string;
}) {
    if (!scheduleId) {
        return { records: [], hasMore: false, attendeeProfiles: [] };
    }

    const baseQuery = collection(db, 'trainingRecords');
    let statusConditions: AttendeeStatus[] | null = null;
    
    if (status === 'pending') {
        statusConditions = ['pending_verification'];
    } else if (status === 'verified') {
        statusConditions = ['docs_verified', 'completed', 'failed'];
    }

    let q = query(
        baseQuery,
        where('scheduleId', '==', scheduleId),
        ...(statusConditions ? [where('status', 'in', statusConditions)] : []),
        orderBy('attendeeName', 'asc'),
        limit(PAGE_SIZE)
    );

    if (lastVisibleId) {
        const lastVisibleSnap = await getDoc(doc(db, 'trainingRecords', lastVisibleId));
        if (lastVisibleSnap.exists()) {
            q = query(q, startAfter(lastVisibleSnap));
        }
    }

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRecord));

    // After fetching records, get their associated attendee profiles
    const attendeeIds = [...new Set(records.map(r => r.attendeeId).filter(Boolean as (s: string | null) => s is string))];
    const attendeeProfiles: AttendeeData[] = [];

    if (attendeeIds.length > 0) {
        // Firestore 'in' query is limited to 30 items per query.
        const batchSize = 30;
        for (let i = 0; i < attendeeIds.length; i += batchSize) {
            const batchIds = attendeeIds.slice(i, i + batchSize);
            const attendeesQuery = query(collection(db, 'attendees'), where(documentId(), 'in', batchIds));
            const attendeesSnapshot = await getDocs(attendeesQuery);
            attendeesSnapshot.forEach(doc => {
                attendeeProfiles.push({ id: doc.id, ...doc.data() } as AttendeeData);
            });
        }
    }

    return {
        records,
        hasMore: records.length === PAGE_SIZE,
        attendeeProfiles
    };
}


/**
 * Finds an existing attendee profile by their National ID or Passport.
 * @param attendeeId The ID to search for.
 * @returns The attendee data or null if not found.
 */
export async function findAttendeeByNationalId(attendeeId: string) {
    if (!attendeeId) return null;
    const attendeeRef = doc(db, 'attendees', attendeeId);
    const attendeeSnap = await getDoc(attendeeRef);
    if (attendeeSnap.exists()) {
        return { id: attendeeSnap.id, ...attendeeSnap.data() } as AttendeeData;
    }
    return null;
}


export async function updateTrainingRecord(recordId: string, updates: Partial<TrainingRecord>) {
    const recordRef = doc(db, 'trainingRecords', recordId);
    
    // If marking as completed, generate certificate ID, date, and expiry date
    if (updates.status === 'completed') {
        const recordSnap = await getDoc(recordRef);
        if (recordSnap.exists()) {
            const recordData = recordSnap.data();
            // Only generate if it doesn't exist to prevent overwriting
            if (!recordData.certificateId) {
                const now = new Date();
                const year = now.getFullYear() + 543; // Buddhist year
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const randomPart = nanoid(6).toUpperCase();
                updates.certificateId = `${year}${month}-${randomPart}`;
                updates.certificateIssueDate = now.toISOString();
                updates.completionDate = now.toISOString();

                // Calculate expiry date
                const courseDoc = await getDoc(doc(db, 'courses', recordData.courseId));
                if (courseDoc.exists()) {
                    const courseData = courseDoc.data() as Course;
                    if (courseData.validityYears && courseData.validityYears > 0) {
                        updates.expiryDate = addYears(now, courseData.validityYears).toISOString();
                    } else {
                        updates.expiryDate = null;
                    }
                }
            }
        }
    }
    
    await updateDoc(recordRef, updates);
    revalidatePath('/erp/attendees');
    revalidatePath('/erp/history');
    revalidatePath('/erp/certificate');
    return { success: true, message: 'อัปเดตข้อมูลการอบรมสำเร็จ' };
}

export async function updateTrainingRecordDetails(recordId: string, updates: { seatNumber?: string; room?: string }) {
  const recordRef = doc(db, 'trainingRecords', recordId);
  try {
    await updateDoc(recordRef, updates);
    revalidatePath('/erp/attendees');
    return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Database Error: ${errorMessage}` };
  }
}

export async function updateAttendeeOrder(orderedRecords: { id: string; seatNumber: number }[]) {
  const batch = writeBatch(db);
  orderedRecords.forEach(record => {
    const docRef = doc(db, 'trainingRecords', record.id);
    batch.update(docRef, { seatNumber: record.seatNumber });
  });

  try {
    await batch.commit();
    revalidatePath('/erp/attendees');
    return { success: true, message: 'บันทึกลำดับสำเร็จ' };
  } catch (error) {
    console.error('Error updating attendee order:', error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกลำดับ' };
  }
}


export async function addAttendeeDocument(formData: FormData) {
    const attendeeId = formData.get('attendeeId') as string;
    const uploadedBy = formData.get('uploadedBy') as string;
    const file = formData.get('file') as File | null;
    const recordId = formData.get('recordId') as string | null;

    if (!attendeeId || !file || file.size === 0) {
        return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
    }

    try {
        const fileRef = ref(storage, `attendees/${attendeeId}/docs/${Date.now()}-${file.name}`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        await uploadBytes(fileRef, buffer);
        const downloadURL = await getDownloadURL(fileRef);

        const newDocument: AdditionalDoc = {
            id: nanoid(),
            name: file.name,
            url: downloadURL,
            uploadedBy: uploadedBy || 'System',
            timestamp: new Date().toISOString(),
        };

        if (recordId) {
             const recordRef = doc(db, 'trainingRecords', recordId);
             const recordSnap = await getDoc(recordRef);
             if (!recordSnap.exists()) throw new Error("Training record not found.");
             const recordData = recordSnap.data() as TrainingRecord;
             const existingDocs = recordData.recordSpecificDocs || [];
             await updateDoc(recordRef, { recordSpecificDocs: [...existingDocs, newDocument]});
        } else {
            const attendeeRef = doc(db, 'attendees', attendeeId);
            const attendeeSnap = await getDoc(attendeeRef);
            if (!attendeeSnap.exists()) throw new Error("Attendee profile not found.");
            const attendeeData = attendeeSnap.data() as AttendeeData;
            const existingDocs = attendeeData.documents || [];
            await updateDoc(attendeeRef, { documents: [...existingDocs, newDocument]});
        }
        
        revalidatePath('/erp/attendees');
        return { success: true, message: 'อัปโหลดไฟล์สำเร็จ' };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}


export async function deleteAttendeeDocument(attendeeId: string, docUrl: string, recordId?: string) {
    try {
        let existingDocs: AdditionalDoc[] = [];
        let docRef;

        if (recordId) {
            docRef = doc(db, 'trainingRecords', recordId);
            const recordSnap = await getDoc(docRef);
            if (!recordSnap.exists()) throw new Error("Training record not found.");
            existingDocs = (recordSnap.data() as TrainingRecord).recordSpecificDocs || [];
        } else {
            docRef = doc(db, 'attendees', attendeeId);
            const attendeeSnap = await getDoc(attendeeRef);
            if (!attendeeSnap.exists()) throw new Error("Attendee not found.");
            existingDocs = (attendeeSnap.data() as AttendeeData).documents || [];
        }
        
        const updatedDocs = existingDocs.filter(doc => doc.url !== docUrl);
        
        const fieldToUpdate = recordId ? 'recordSpecificDocs' : 'documents';
        await updateDoc(docRef, { [fieldToUpdate]: updatedDocs });

        if (docUrl && docUrl.includes('firebasestorage.googleapis.com')) {
            try {
                const fileRef = ref(storage, docUrl);
                await deleteObject(fileRef);
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.error(`Failed to delete file ${docUrl}:`, error);
                }
            }
        }

        revalidatePath('/erp/attendees');
        return { success: true, message: 'ลบเอกสารสำเร็จ' };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}


export async function updateSingleAttendeeData(formData: FormData) {
    const recordId = formData.get('recordId') as string;
    const newAttendeeId = formData.get('attendeeId') as string;

    if (!recordId) {
        return { success: false, message: 'Missing Record ID' };
    }
    
    try {
        const batch = writeBatch(db);
        const recordRef = doc(db, 'trainingRecords', recordId);
        const recordSnap = await getDoc(recordRef);
        if (!recordSnap.exists()) throw new Error("Training record not found.");
        
        const recordToUpdate = { ...recordSnap.data() } as TrainingRecord;
        
        ['attendeeName', 'companyName'].forEach(field => {
            if (formData.has(field)) {
                recordToUpdate[field] = formData.get(field) as string;
            }
        });

        const attendeeProfileRef = newAttendeeId ? doc(db, 'attendees', newAttendeeId) : null;
        
        const profileUpdates: Partial<AttendeeData> = {};
        if (formData.has('dateOfBirth')) profileUpdates.dateOfBirth = formData.get('dateOfBirth') as string;
        if (formData.has('education')) profileUpdates.education = formData.get('education') as string;
        if (newAttendeeId) profileUpdates.attendeeId = newAttendeeId;
        profileUpdates.fullName = recordToUpdate.attendeeName;

        const profilePictureFile = formData.get('profilePicture') as File;
        if (profilePictureFile && profilePictureFile.size > 0 && newAttendeeId) {
            const fileRef = ref(storage, `attendees/${newAttendeeId}/profilePicture-${nanoid()}`);
            const arrayBuffer = await profilePictureFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            await uploadBytes(fileRef, buffer);
            profileUpdates.profilePicture = await getDownloadURL(fileRef);
        }

        if (attendeeProfileRef) {
            batch.set(attendeeProfileRef, profileUpdates, { merge: true });
            recordToUpdate.attendeeId = newAttendeeId;
        }

        batch.update(recordRef, recordToUpdate);
        await batch.commit();

        revalidatePath('/erp/attendees');

        return { success: true, message: 'อัปเดตข้อมูลผู้อบรมสำเร็จ' };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        console.error("Error in updateSingleAttendeeData: ", error);
        return { success: false, message: error };
    }
}

const WalkInAttendeeSchema = z.object({
  attendeeName: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
  companyName: z.string().min(1, 'กรุณากรอกชื่อบริษัท'),
  scheduleId: z.string(),
  courseId: z.string(),
});

export type WalkInFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createWalkInAttendee(prevState: WalkInFormState, formData: FormData): Promise<WalkInFormState> {
    const validatedFields = WalkInAttendeeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'ข้อมูลไม่ถูกต้อง',
        };
    }

    const { attendeeName, companyName, scheduleId, courseId } = validatedFields.data;

    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) throw new Error('Course not found');
        const course = courseSnap.data() as Course;

        const newRecordData: Omit<TrainingRecord, 'id'> = {
            attendeeId: null,
            attendeeName,
            companyName,
            registrationId: `walk-in-${nanoid()}`,
            registrationAttendeeId: `walk-in-${nanoid()}`,
            scheduleId,
            courseId,
            courseTitle: course.title,
            completionDate: '',
            status: 'pending_verification',
            attendance: 'not_checked_in',
        };

        await addDoc(collection(db, 'trainingRecords'), newRecordData);
        
        revalidatePath('/erp/attendees');
        return { success: true, message: 'เพิ่มผู้อบรมสำเร็จ' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Database Error: ${errorMessage}` };
    }
}


export async function deleteTrainingRecord(recordId: string) {
    if (!recordId) {
        return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
    }
    try {
        await deleteDoc(doc(db, 'trainingRecords', recordId));
        revalidatePath('/erp/attendees');
        return { success: true, message: 'ลบข้อมูลผู้อบรมสำเร็จ' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Database Error: ${errorMessage}` };
    }
}
