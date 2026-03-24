
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export async function findCertificateById(searchId: string) {
    if (!searchId) {
        return { success: false, message: 'กรุณากรอกเลขที่เพื่อค้นหา' };
    }

    try {
        // First, try searching by Certificate ID
        let q = query(
            collection(db, 'trainingRecords'),
            where('certificateId', '==', searchId),
            where('status', '==', 'completed'),
            limit(1)
        );
        let querySnapshot = await getDocs(q);

        // If not found, try searching by Attendee ID (National ID) and get the latest one
        if (querySnapshot.empty) {
            q = query(
                collection(db, 'trainingRecords'),
                where('attendeeId', '==', searchId),
                where('status', '==', 'completed'),
                orderBy('completionDate', 'desc'), // Order by completion date to get the latest
                limit(1)
            );
            querySnapshot = await getDocs(q);
        }

        if (querySnapshot.empty) {
            return { success: false, message: 'ไม่พบข้อมูลใบประกาศนียบัตรสำหรับเลขที่นี้' };
        }

        const recordId = querySnapshot.docs[0].id;
        
        return { success: true, recordId: recordId };

    } catch (e) {
        console.error("Certificate search error:", e);
        return { success: false, message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' };
    }
}
