

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


export async function getPaginatedHistory({ 
    searchQuery = '', 
    companyFilter = 'all', 
    lastVisibleId 
}: { 
    searchQuery?: string; 
    companyFilter?: string;
    lastVisibleId?: string;
}) {

    // Due to Firestore limitations, we cannot perform a full-text search directly.
    // The query will be broad, and then we'll filter in-memory.
    // For a large-scale production app, a dedicated search service like Algolia or MeiliSearch is recommended.
    let recordsQuery = query(
        collection(db, 'trainingRecords'),
        where('status', '==', 'completed')
    );
    
    if (companyFilter !== 'all') {
        recordsQuery = query(recordsQuery, where('companyName', '==', companyFilter));
    }

    const recordsSnapshot = await getDocs(recordsQuery);

    const allRecords = recordsSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            completionDate: toISOStringSafe(data.completionDate),
            certificateIssueDate: toISOStringSafe(data.certificateIssueDate),
            expiryDate: data.expiryDate ? toISOStringSafe(data.expiryDate) : null,
        } as TrainingRecord;
    });

    // --- In-memory filtering for search query ---
    const searchLower = searchQuery.toLowerCase();
    const filteredRecords = searchQuery ? allRecords.filter(record => 
        record.attendeeName.toLowerCase().includes(searchLower) ||
        record.companyName.toLowerCase().includes(searchLower)
    ) : allRecords;

    // --- In-memory Pagination ---
    let paginatedRecords: TrainingRecord[] = [];
    let nextLastVisibleId: string | null = null;
    const startIndex = lastVisibleId ? filteredRecords.findIndex(r => r.id === lastVisibleId) + 1 : 0;
    
    if (startIndex < filteredRecords.length) {
        paginatedRecords = filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
        if (startIndex + PAGE_SIZE < filteredRecords.length) {
            nextLastVisibleId = paginatedRecords[paginatedRecords.length - 1].id;
        }
    }

    // --- Fetch related data only for the paginated results ---
    const attendeeIds = [...new Set(paginatedRecords.map(r => r.attendeeId).filter(Boolean as (s: string | null) => s is string))];
    const courseIds = [...new Set(paginatedRecords.map(r => r.courseId))];

    const [attendeesMap, coursesMap] = await Promise.all([
        fetchDataMap<AttendeeData>(collection(db, 'attendees'), attendeeIds),
        fetchDataMap<Course>(collection(db, 'courses'), courseIds),
    ]);
    
    return {
        records: paginatedRecords,
        attendeesMap: Object.fromEntries(attendeesMap),
        coursesMap: Object.fromEntries(coursesMap),
        hasMore: !!nextLastVisibleId,
        lastVisibleId: nextLastVisibleId
    };
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
            await updateDoc(fileRef as any, profilePictureFile);
            profileUpdates.profilePicture = await getDoc(fileRef).then(d => d.data()?.toString());
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
