

'use server';

import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, startAfter, limit, documentId, getDoc, updateDoc, writeBatch, doc, addDoc } from 'firebase/firestore';
import type { TrainingRecord, AttendeeData, Course, AdditionalDoc } from '@/lib/course-data';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

const PAGE_SIZE = 24;

// Helper function to safely convert Firestore Timestamps to ISO strings
const toISOStringSafe = (date: any): string => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date.toDate) return date.toDate().toISOString();
    return new Date(date).toISOString();
};

const normalizeRecord = (d: any): TrainingRecord => {
    const data = d.data();
    return {
        id: d.id,
        ...data,
        completionDate: toISOStringSafe(data.completionDate),
        certificateIssueDate: toISOStringSafe(data.certificateIssueDate),
        expiryDate: data.expiryDate ? toISOStringSafe(data.expiryDate) : null,
    } as TrainingRecord;
};

export async function getPaginatedHistory({
    searchQuery = '',
    companyFilter = 'all',
    courseFilter = 'all',
    yearFilter,
    lastVisibleId
}: {
    searchQuery?: string;
    companyFilter?: string;
    courseFilter?: string;
    yearFilter?: number;       // CE year (e.g. 2024). Thai year shown in UI but stored as CE.
    lastVisibleId?: string;
}) {
    const trainingRecordsColl = collection(db, 'trainingRecords');

    // ── Token-based search path ───────────────────────────────────────────────
    // When a search query is given, use `searchTokens array-contains` if possible.
    // This is O(index_hits) not O(collection_size).
    if (searchQuery) {
        const token = searchQuery.toLowerCase().trim().split(/\s+/)[0]; // Use first word as token
        if (token.length >= 2) {
            // Build conditions with all active filters
            const conditions: any[] = [
                where('passedTraining', '==', true),
                where('searchTokens', 'array-contains', token),
            ];
            if (companyFilter !== 'all') conditions.push(where('companyName', '==', companyFilter));
            if (courseFilter !== 'all') conditions.push(where('courseId', '==', courseFilter));
            if (yearFilter) conditions.push(where('completionYearCE', '==', yearFilter));

            // Note: array-contains + orderBy completionDate requires a composite index.
            // Fall back to no orderBy here; client sorts by completionDate.
            const tokenQuery = query(trainingRecordsColl, ...conditions, limit(PAGE_SIZE * 3));
            const snap = await getDocs(tokenQuery);
            const allRecords = snap.docs.map(normalizeRecord);

            // Further filter by second word if present
            const words = searchQuery.toLowerCase().trim().split(/\s+/);
            const filtered = words.length > 1
                ? allRecords.filter(r => {
                    const hay = `${r.attendeeName} ${r.companyName}`.toLowerCase();
                    return words.every(w => hay.includes(w));
                })
                : allRecords;

            const startIndex = lastVisibleId ? filtered.findIndex(r => r.id === lastVisibleId) + 1 : 0;
            const page = filtered.slice(startIndex, startIndex + PAGE_SIZE);
            const nextId = startIndex + PAGE_SIZE < filtered.length ? page[page.length - 1]?.id ?? null : null;

            const [attendeesMap, coursesMap] = await enrichRecords(page);
            return { records: page, attendeesMap, coursesMap, hasMore: !!nextId, lastVisibleId: nextId };
        }
    }

    // ── Cursor-based Firestore pagination (no text search) ────────────────────
    const conditions: any[] = [
        where('status', '==', 'completed'),
    ];
    if (companyFilter !== 'all') conditions.push(where('companyName', '==', companyFilter));
    if (courseFilter !== 'all') conditions.push(where('courseId', '==', courseFilter));
    if (yearFilter) conditions.push(where('completionYearCE', '==', yearFilter));

    let recordsQuery = query(
        trainingRecordsColl,
        ...conditions,
        orderBy('completionDate', 'desc'),
        limit(PAGE_SIZE)
    );

    if (lastVisibleId) {
        const lastSnap = await getDoc(doc(trainingRecordsColl, lastVisibleId));
        if (lastSnap.exists()) {
            recordsQuery = query(recordsQuery, startAfter(lastSnap));
        }
    }

    const recordsSnapshot = await getDocs(recordsQuery);
    const paginatedRecords = recordsSnapshot.docs.map(normalizeRecord);
    const nextLastVisibleId = paginatedRecords.length === PAGE_SIZE ? paginatedRecords[paginatedRecords.length - 1].id : null;

    const [attendeesMap, coursesMap] = await enrichRecords(paginatedRecords);
    return { records: paginatedRecords, attendeesMap, coursesMap, hasMore: !!nextLastVisibleId, lastVisibleId: nextLastVisibleId };
}

async function enrichRecords(records: TrainingRecord[]): Promise<[Record<string, AttendeeData>, Record<string, Course>]> {
    const attendeeIds = [...new Set(records.map(r => r.attendeeId).filter((id): id is string => id !== null))];
    const courseIds = [...new Set(records.map(r => r.courseId))];
    const [attendeesMap, coursesMap] = await Promise.all([
        fetchDataMap<AttendeeData>(collection(db, 'attendees'), attendeeIds),
        fetchDataMap<Course>(collection(db, 'courses'), courseIds),
    ]);
    return [Object.fromEntries(attendeesMap), Object.fromEntries(coursesMap)];
}


async function fetchDataMap<T>(coll: any, ids: string[]): Promise<Map<string, T>> {
    const dataMap = new Map<string, T>();
    if (ids.length === 0) return dataMap;

    const batchSize = 30;
    for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const q = query(coll, where(documentId(), 'in', batchIds));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            dataMap.set(doc.id, { id: doc.id, ...doc.data() } as T);
        });
    }
    return dataMap;
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
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        const newDocument: AdditionalDoc = {
            id: nanoid(),
            name: file.name,
            url: downloadURL,
            uploadedBy: uploadedBy || 'System',
            timestamp: new Date().toISOString(),
        };

        // If a recordId is provided, add it to the specific trainingRecord
        if (recordId) {
             const recordRef = doc(db, 'trainingRecords', recordId);
             const recordSnap = await getDoc(recordRef);
             if (!recordSnap.exists()) throw new Error("Training record not found.");
             const recordData = recordSnap.data() as TrainingRecord;
             const existingDocs = recordData.recordSpecificDocs || [];
             await updateDoc(recordRef, { recordSpecificDocs: [...existingDocs, newDocument]});
        } else {
            // Otherwise, add it to the main attendee profile
            const attendeeRef = doc(db, 'attendees', attendeeId);
            const attendeeSnap = await getDoc(attendeeRef);
            if (!attendeeSnap.exists()) throw new Error("Attendee profile not found.");
            const attendeeData = attendeeSnap.data() as AttendeeData;
            const existingDocs = attendeeData.documents || [];
            await updateDoc(attendeeRef, { documents: [...existingDocs, newDocument]});
        }
        
        revalidatePath('/erp/history');
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

        try {
            const fileRef = ref(storage, docUrl);
            await deleteObject(fileRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.error(`Failed to delete file ${docUrl}:`, error);
            }
        }

        revalidatePath('/erp/history');
        return { success: true, message: 'ลบเอกสารสำเร็จ' };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}


export async function updateSingleAttendeeData(formData: FormData) {
    const recordId = formData.get('recordId') as string;
    const newAttendeeId = formData.get('attendeeId') as string; // This is the new National ID / Passport

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

        revalidatePath('/erp/history');

        return { success: true, message: 'อัปเดตข้อมูลผู้เข้าอบรมสำเร็จ' };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        console.error("Error in updateSingleAttendeeData: ", error);
        return { success: false, message: error };
    }
}
