'use server';

import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, writeBatch, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, orderBy, startAfter, limit, DocumentData, documentId, runTransaction } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Registration, AttendeeStatus, RegistrationFormField, AttendeeAttendanceStatus, AdditionalDoc, AttendeeData, TrainingRecord, Course } from '@/lib/course-data';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {nanoid} from 'nanoid';
import { format, addYears } from 'date-fns';
import { generateSearchTokens } from '@/lib/search-utils';
import { buildFullName } from '@/lib/attendee-utils';
import { z } from 'zod';
import { createSystemNotification } from '@/lib/notifications';

const PAGE_SIZE = 30;

/**
 * Atomically increments the per-course certificate counter and returns a new
 * certificate ID in the format YYMMDD-XXXX (Buddhist year, 4-digit sequence).
 */
async function generateCertificateId(courseId: string, now: Date): Promise<string> {
    const counterRef = doc(db, 'courseCounters', courseId);
    let counter = 1;
    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(counterRef);
        counter = (snap.data()?.count ?? 0) + 1;
        transaction.set(counterRef, { count: counter }, { merge: true });
    });
    const yy = ((now.getFullYear() + 543) % 100).toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    return `${yy}${mm}${dd}-${counter.toString().padStart(4, '0')}`;
}

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
    const attendeeIds = [...new Set(records.map(r => r.attendeeId).filter((id): id is string => !!id))];
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


function validateThaiID(id: string): boolean {
    if (!/^[0-9]{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(id.charAt(i)) * (13 - i);
    return ((11 - (sum % 11)) % 10) === parseInt(id.charAt(12));
}

export async function updateTrainingRecord(recordId: string, updates: Partial<TrainingRecord>) {
    const recordRef = doc(db, 'trainingRecords', recordId);

    // Guard: require valid National ID before docs_verified
    if (updates.status === 'docs_verified') {
        const snap = await getDoc(recordRef);
        if (snap.exists()) {
            const data = snap.data() as TrainingRecord;
            if (!data.attendeeId || !validateThaiID(data.attendeeId)) {
                return { success: false, message: 'ต้องกรอกเลขบัตรประชาชนที่ถูกต้องก่อนเปลี่ยนสถานะ' };
            }
        }
    }

    // If marking as completed, generate certificate ID, date, expiry date, and search tokens
    if (updates.status === 'completed') {
        const recordSnap = await getDoc(recordRef);
        if (recordSnap.exists()) {
            const recordData = recordSnap.data() as TrainingRecord;
            // Only generate certificate info if it doesn't exist to prevent overwriting
            if (!recordData.certificateId) {
                const now = new Date();
                updates.certificateId = await generateCertificateId(recordData.courseId, now);
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
            // Always populate search/index fields when completing
            const completionTime = updates.completionDate ? new Date(updates.completionDate) : new Date();
            updates.passedTraining = true;
            updates.completionYearCE = completionTime.getFullYear();
            updates.searchTokens = generateSearchTokens(
                recordData.attendeeName,
                recordData.companyName,
                recordData.attendeeFirstName,
                recordData.attendeeLastName
            );
        }
    }

    await updateDoc(recordRef, updates);

    let completedRecord: TrainingRecord | undefined;
    if (updates.status === 'completed') {
        const recordSnap2 = await getDoc(recordRef);
        if (recordSnap2.exists()) {
            completedRecord = { id: recordId, ...recordSnap2.data() } as TrainingRecord;
            await autoCreateDeliveryIfNeeded(completedRecord.registrationId, completedRecord.attendeeName || 'ระบบ');
            createSystemNotification({
                title: 'ผ่านการอบรม — ตรวจสอบการจัดส่ง',
                message: `${completedRecord.attendeeName} ผ่านอบรม ${completedRecord.courseTitle} เรียบร้อยแล้ว`,
                type: 'success',
                link: '/erp/delivery',
                forRole: 'course_specialist',
            }).catch(() => {});
        }
    } else if (updates.status === 'docs_verified') {
        const recordSnap3 = await getDoc(recordRef);
        if (recordSnap3.exists()) {
            const verifiedData = recordSnap3.data() as TrainingRecord;
            createSystemNotification({
                title: 'เอกสารผ่านการตรวจสอบ',
                message: `${verifiedData.attendeeName} เอกสารครบถ้วนแล้ว พร้อมตัดเกรด`,
                type: 'info',
                link: '/erp/attendees',
                forRole: 'training_team',
            }).catch(() => {});
        }
    }

    revalidatePath('/erp/attendees');
    revalidatePath('/erp/history');
    revalidatePath('/erp/certificate');
    return { success: true, message: 'อัปเดตข้อมูลการอบรมสำเร็จ', record: completedRecord };
}

async function autoCreateDeliveryIfNeeded(registrationId: string, createdBy: string) {
    if (!registrationId || registrationId.startsWith('walk-in-') || registrationId.startsWith('bulk-import-')) return;
    try {
        const regSnap = await getDoc(doc(db, 'registrations', registrationId));
        if (!regSnap.exists()) return;
        const reg = regSnap.data() as Registration;
        if (reg.deliveryPackageId) return; // already exists
        const courseSnap = await getDoc(doc(db, 'courses', reg.courseId));
        if (!courseSnap.exists()) return;
        const course = courseSnap.data() as Course;
        if (!(course.deliverables ?? []).some((d: any) => d.enabled)) return; // no deliverables configured
        const { createDeliveryPackage } = await import('@/app/erp/delivery/actions');
        await createDeliveryPackage(registrationId, createdBy);
    } catch (e) {
        console.error('autoCreateDelivery failed for', registrationId, e);
    }
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
            const attendeeSnap = await getDoc(docRef);
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
        
        (['attendeeName', 'companyName', 'attendeeTitle', 'attendeeFirstName', 'attendeeLastName'] as const).forEach(field => {
            if (formData.has(field)) {
                (recordToUpdate as any)[field] = formData.get(field) as string;
            }
        });

        // Recompute combined attendeeName if any name part changed
        if (formData.has('attendeeFirstName') || formData.has('attendeeLastName') || formData.has('attendeeTitle')) {
            const computed = buildFullName(recordToUpdate.attendeeTitle, recordToUpdate.attendeeFirstName, recordToUpdate.attendeeLastName);
            if (computed) recordToUpdate.attendeeName = computed;
        }

        const attendeeProfileRef = newAttendeeId ? doc(db, 'attendees', newAttendeeId) : null;

        const profileUpdates: Partial<AttendeeData> = {};
        if (formData.has('dateOfBirth')) profileUpdates.dateOfBirth = formData.get('dateOfBirth') as string;
        if (formData.has('education')) profileUpdates.education = formData.get('education') as string;
        if (newAttendeeId) profileUpdates.attendeeId = newAttendeeId;
        profileUpdates.fullName = recordToUpdate.attendeeName;
        profileUpdates.title = recordToUpdate.attendeeTitle;
        profileUpdates.firstName = recordToUpdate.attendeeFirstName;
        profileUpdates.lastName = recordToUpdate.attendeeLastName;

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


/**
 * Bulk complete training records with proper certificate generation per record.
 * Unlike bulkUpdateTrainingRecords, this generates a unique certificateId, issue date,
 * expiry date, and searchTokens for each record individually.
 */
export async function bulkCompleteTrainingRecords(recordIds: string[]): Promise<{ success: boolean; message: string; completed: number; skipped: number }> {
    if (!recordIds || recordIds.length === 0) {
        return { success: false, message: 'ไม่มีรายการที่เลือก', completed: 0, skipped: 0 };
    }

    const CHUNK_SIZE = 30;
    const WRITE_CHUNK = 400;
    const now = new Date();
    const yy = ((now.getFullYear() + 543) % 100).toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const completionYearCE = now.getFullYear();

    // Cache course validity to avoid redundant reads
    const courseCache = new Map<string, number | null>();

    // Step 1: Read all records and separate new completions from already-completed
    type RecordEntry = { id: string; data: TrainingRecord };
    const newCompletions: RecordEntry[] = [];
    const alreadyCompleted: string[] = [];
    const completedRegistrationIds: string[] = [];

    for (let i = 0; i < recordIds.length; i += CHUNK_SIZE) {
        const chunk = recordIds.slice(i, i + CHUNK_SIZE);
        const snaps = await Promise.all(chunk.map(id => getDoc(doc(db, 'trainingRecords', id))));
        for (const snap of snaps) {
            if (!snap.exists()) continue;
            const data = snap.data() as TrainingRecord;
            if (data.status === 'completed' && data.certificateId) {
                alreadyCompleted.push(snap.id);
            } else {
                newCompletions.push({ id: snap.id, data });
                completedRegistrationIds.push(data.registrationId);
            }
        }
    }

    // Step 2: Pre-fetch course validity
    for (const { data } of newCompletions) {
        if (!courseCache.has(data.courseId)) {
            const courseSnap = await getDoc(doc(db, 'courses', data.courseId));
            if (courseSnap.exists()) {
                const c = courseSnap.data() as Course;
                courseCache.set(data.courseId, c.validityYears && c.validityYears > 0 ? c.validityYears : null);
            } else {
                courseCache.set(data.courseId, null);
            }
        }
    }

    // Step 3: Pre-allocate counter ranges per course atomically
    // Count how many new certificates each course needs
    const courseNewCount = new Map<string, number>();
    for (const { data } of newCompletions) {
        if (!data.certificateId) { // only if cert doesn't already exist
            courseNewCount.set(data.courseId, (courseNewCount.get(data.courseId) ?? 0) + 1);
        }
    }
    // For each course, atomically reserve a block of consecutive counter values
    const courseStartCounter = new Map<string, number>(); // courseId -> first counter in block
    for (const [courseId, count] of courseNewCount) {
        await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, 'courseCounters', courseId);
            const snap = await transaction.get(counterRef);
            const current = snap.data()?.count ?? 0;
            courseStartCounter.set(courseId, current + 1);
            transaction.set(counterRef, { count: current + count }, { merge: true });
        });
    }

    // Step 4: Build updates, assigning sequential IDs within each course
    const courseCurrentCounter = new Map(courseStartCounter);
    const recordUpdates: { id: string; updates: Partial<TrainingRecord> }[] = [];

    for (const { id, data } of newCompletions) {
        const validityYears = courseCache.get(data.courseId) ?? null;
        const expiryDate = validityYears ? addYears(now, validityYears).toISOString() : null;

        let certId = data.certificateId;
        if (!certId) {
            const counter = courseCurrentCounter.get(data.courseId)!;
            courseCurrentCounter.set(data.courseId, counter + 1);
            certId = `${yy}${mm}${dd}-${counter.toString().padStart(4, '0')}`;
        }

        recordUpdates.push({
            id,
            updates: {
                status: 'completed',
                certificateId: certId,
                certificateIssueDate: data.certificateIssueDate || now.toISOString(),
                completionDate: data.completionDate || now.toISOString(),
                expiryDate,
                passedTraining: true,
                completionYearCE,
                searchTokens: generateSearchTokens(data.attendeeName, data.companyName, data.attendeeFirstName, data.attendeeLastName),
            },
        });
    }

    const skipped = alreadyCompleted.length;

    for (let i = 0; i < recordUpdates.length; i += WRITE_CHUNK) {
        const chunk = recordUpdates.slice(i, i + WRITE_CHUNK);
        const batch = writeBatch(db);
        chunk.forEach(({ id, updates }) => batch.update(doc(db, 'trainingRecords', id), updates as Partial<TrainingRecord>));
        await batch.commit();
    }

    // Auto-create delivery packages for unique registrations
    const uniqueRegIds = [...new Set(completedRegistrationIds)];
    await Promise.allSettled(uniqueRegIds.map(rid => autoCreateDeliveryIfNeeded(rid, 'system-auto')));

    revalidatePath('/erp/attendees');
    revalidatePath('/erp/history');
    revalidatePath('/erp/certificate');
    return {
        success: true,
        message: `ตัดเกรดผ่านการอบรม ${recordUpdates.length} ท่าน${skipped > 0 ? ` (ข้าม ${skipped} ที่ผ่านแล้ว)` : ''}`,
        completed: recordUpdates.length,
        skipped,
    };
}

/** Bulk update multiple training records in one call (batched to stay under Firestore 500-op limit) */
export async function bulkUpdateTrainingRecords(recordIds: string[], updates: Partial<TrainingRecord>) {
    if (!recordIds || recordIds.length === 0) {
        return { success: false, message: 'ไม่มีรายการที่เลือก' };
    }
    const CHUNK_SIZE = 400;
    try {
        for (let i = 0; i < recordIds.length; i += CHUNK_SIZE) {
            const chunk = recordIds.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(id => batch.update(doc(db, 'trainingRecords', id), updates));
            await batch.commit();
        }
        revalidatePath('/erp/attendees');
        return { success: true, message: `อัปเดต ${recordIds.length} รายการสำเร็จ` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Database Error: ${errorMessage}` };
    }
}

/** Bulk check-in: marks all selected attendees as present and logs to schedule history */
export async function bulkCheckInAttendees(scheduleId: string, recordIds: string[], performedBy: string) {
    if (!recordIds || recordIds.length === 0) {
        return { success: false, message: 'ไม่มีรายการที่เลือก' };
    }
    const CHUNK_SIZE = 400;
    try {
        for (let i = 0; i < recordIds.length; i += CHUNK_SIZE) {
            const chunk = recordIds.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(id => batch.update(doc(db, 'trainingRecords', id), { attendance: 'present' }));
            await batch.commit();
        }
        // Log to schedule history subcollection
        await addDoc(collection(db, 'trainingSchedules', scheduleId, 'history'), {
            action: 'bulk_checkin',
            count: recordIds.length,
            performedBy,
            timestamp: new Date().toISOString(),
        });
        revalidatePath('/erp/attendees');
        return { success: true, message: `เช็คชื่อเข้าอบรม ${recordIds.length} ท่านสำเร็จ` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Database Error: ${errorMessage}` };
    }
}

export type BulkImportRow = {
    attendeeName: string;       // combined — used as fallback or legacy format
    attendeeTitle?: string;     // คำนำหน้า (new format)
    attendeeFirstName?: string; // ชื่อ (new format)
    attendeeLastName?: string;  // นามสกุล (new format)
    companyName: string;
    attendeeId?: string;        // National ID / Passport (optional)
};

/** CSV bulk import: creates training records for a list of attendees */
export async function bulkImportWalkInAttendees(rows: BulkImportRow[], scheduleId: string): Promise<{ success: boolean; message: string; created: number; errors: string[] }> {
    if (!rows || rows.length === 0 || !scheduleId) {
        return { success: false, message: 'ข้อมูลไม่ครบถ้วน', created: 0, errors: [] };
    }

    const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));
    if (!scheduleSnap.exists()) {
        return { success: false, message: 'ไม่พบรอบอบรม', created: 0, errors: [] };
    }
    const scheduleData = scheduleSnap.data();
    const courseId = scheduleData.courseId as string;
    const courseTitle = scheduleData.courseTitle as string;

    const errors: string[] = [];
    const CHUNK_SIZE = 400;
    let created = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const row of chunk) {
            const rowNum = i + chunk.indexOf(row) + 1;
            if (!row.attendeeName || !row.companyName) {
                errors.push(`แถวที่ ${rowNum}: ชื่อหรือบริษัทไม่ครบ`);
                continue;
            }
            // Check schedule conflict if attendeeId is provided
            if (row.attendeeId) {
                const conflict = await checkScheduleConflict(row.attendeeId, scheduleId);
                if (conflict.hasConflict) {
                    errors.push(`แถวที่ ${rowNum} (${row.attendeeName}): วันอบรมซ้อนกับรอบ "${conflict.conflictingCourseTitle}"`);
                    continue;
                }
            }
            const newRef = doc(collection(db, 'trainingRecords'));
            const fullName = (row.attendeeFirstName || row.attendeeLastName)
                ? buildFullName(row.attendeeTitle, row.attendeeFirstName, row.attendeeLastName)
                : row.attendeeName.trim();
            const recordData: Omit<TrainingRecord, 'id'> = {
                attendeeId: row.attendeeId || null,
                attendeeName: fullName,
                ...(row.attendeeTitle && { attendeeTitle: row.attendeeTitle }),
                ...(row.attendeeFirstName && { attendeeFirstName: row.attendeeFirstName }),
                ...(row.attendeeLastName && { attendeeLastName: row.attendeeLastName }),
                companyName: row.companyName.trim(),
                registrationId: `bulk-import-${nanoid()}`,
                registrationAttendeeId: `bulk-import-${nanoid()}`,
                scheduleId,
                courseId,
                courseTitle,
                completionDate: '',
                status: 'pending_verification',
                attendance: 'not_checked_in',
            };
            batch.set(newRef, recordData);
            created++;
        }
        await batch.commit();
    }

    revalidatePath('/erp/attendees');
    return {
        success: true,
        message: `นำเข้าสำเร็จ ${created} รายการ${errors.length > 0 ? ` (มีข้อผิดพลาด ${errors.length} รายการ)` : ''}`,
        created,
        errors,
    };
}

/** Check if an attendee (by attendeeId/National ID) has a scheduling conflict with the given schedule */
export async function checkScheduleConflict(attendeeId: string, scheduleId: string): Promise<{ hasConflict: boolean; conflictingScheduleId?: string; conflictingCourseTitle?: string }> {
    if (!attendeeId || !scheduleId) return { hasConflict: false };

    const targetSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));
    if (!targetSnap.exists()) return { hasConflict: false };
    const target = targetSnap.data();
    const targetStart = new Date(target.startDate).getTime();
    const targetEnd = new Date(target.endDate).getTime();

    // Get all training records for this attendee
    const existingQ = query(
        collection(db, 'trainingRecords'),
        where('attendeeId', '==', attendeeId),
        where('status', 'in', ['pending_verification', 'docs_verified'])
    );
    const existingSnap = await getDocs(existingQ);

    for (const recordDoc of existingSnap.docs) {
        const record = recordDoc.data() as TrainingRecord;
        if (record.scheduleId === scheduleId) continue; // Same schedule, skip
        const schedSnap = await getDoc(doc(db, 'trainingSchedules', record.scheduleId));
        if (!schedSnap.exists()) continue;
        const sched = schedSnap.data();
        const schedStart = new Date(sched.startDate).getTime();
        const schedEnd = new Date(sched.endDate).getTime();
        // Check overlap: two ranges [a,b] and [c,d] overlap if a <= d && c <= b
        if (targetStart <= schedEnd && schedStart <= targetEnd) {
            return { hasConflict: true, conflictingScheduleId: record.scheduleId, conflictingCourseTitle: record.courseTitle };
        }
    }
    return { hasConflict: false };
}

/** Bulk email to all registrations in a schedule */
export async function sendBulkScheduleEmail(scheduleId: string, subject: string, messageBody: string): Promise<{ success: boolean; message: string; sent: number; failed: number }> {
    if (!scheduleId || !subject || !messageBody) {
        return { success: false, message: 'ข้อมูลไม่ครบถ้วน', sent: 0, failed: 0 };
    }
    const { sendEmail, emailTemplates } = await import('@/lib/mail');
    const schedSnap = await getDoc(doc(db, 'trainingSchedules', scheduleId));
    if (!schedSnap.exists()) return { success: false, message: 'ไม่พบรอบอบรม', sent: 0, failed: 0 };
    const sched = schedSnap.data();

    const regsQ = query(collection(db, 'registrations'), where('scheduleId', '==', scheduleId), where('status', '!=', 'cancelled'));
    const regsSnap = await getDocs(regsQ);

    const uniqueEmails = [...new Set(regsSnap.docs.map(d => d.data().userEmail as string).filter(Boolean))];

    let sent = 0;
    let failed = 0;
    const results = await Promise.allSettled(uniqueEmails.map(email => {
        const tpl = emailTemplates.bulkScheduleNotice(sched.courseTitle, sched.startDate, messageBody);
        return sendEmail({ to: email, subject, html: tpl.html });
    }));
    results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);

    return { success: true, message: `ส่งอีเมลสำเร็จ ${sent} รายการ, ล้มเหลว ${failed} รายการ`, sent, failed };
}

/**
 * Marks an exam session as superseded so the trainee can retake the exam.
 * The old session is preserved with superseded=true for audit history.
 * The trainee's score on the TrainingRecord is cleared.
 */
export async function resetExamSession(
    sessionId: string,
    examType: 'pretest' | 'posttest',
    trainingRecordId: string,
    staffUid: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const now = new Date().toISOString();
        const scoreField = examType === 'pretest' ? 'preTestScore' : 'postTestScore';
        const batch = writeBatch(db);
        batch.update(doc(db, 'examSessions', sessionId), {
            superseded: true,
            supersededAt: now,
            supersededBy: staffUid,
        });
        batch.update(doc(db, 'trainingRecords', trainingRecordId), {
            [scoreField]: '',
        });
        await batch.commit();
        return { success: true, message: 'รีเซ็ตแบบทดสอบแล้ว ผู้อบรมสามารถสอบใหม่ได้' };
    } catch (e) {
        console.error('resetExamSession error', e);
        return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
    }
}
