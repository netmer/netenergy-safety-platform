'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, updateDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/audit';
import type { Registration, Course, DeliveryPackage, DeliveryItem, DeliveryItemStatus, DeliverableType } from '@/lib/course-data';

function computeOverallStatus(items: DeliveryItem[]): DeliveryItemStatus {
    const active = items.filter(i => i.status !== 'ไม่มี');
    if (active.length === 0) return 'ไม่มี';
    if (active.every(i => i.status === 'ได้รับแล้ว')) return 'ได้รับแล้ว';
    if (active.some(i => i.status === 'จัดส่งแล้ว')) return 'จัดส่งแล้ว';
    if (active.some(i => i.status === 'กำลังเตรียม')) return 'กำลังเตรียม';
    return 'รอดำเนินการ';
}

export async function createDeliveryPackage(
    registrationId: string,
    createdBy: string
): Promise<{ success: boolean; message: string; packageId?: string }> {
    try {
        const regSnap = await getDoc(doc(db, 'registrations', registrationId));
        if (!regSnap.exists()) return { success: false, message: 'ไม่พบข้อมูลการลงทะเบียน' };
        const reg = { id: regSnap.id, ...regSnap.data() } as Registration;

        if (reg.deliveryPackageId) return { success: false, message: 'มีแพ็กเกจจัดส่งอยู่แล้ว' };

        // Get course deliverables config
        const courseSnap = await getDoc(doc(db, 'courses', reg.courseId));
        const courseData = courseSnap.exists() ? courseSnap.data() as Course : null;
        const deliverables = courseData?.deliverables ?? [];

        // Build items from enabled deliverables
        const now = new Date().toISOString();
        const items: DeliveryItem[] = deliverables
            .filter(d => d.enabled)
            .map(d => ({
                type: d.type,
                label: d.type === 'other' ? (d.customLabel || d.label) : d.label,
                status: 'รอดำเนินการ' as DeliveryItemStatus,
                updatedAt: now,
                updatedBy: createdBy,
            }));

        // Extract shipping address from formData
        let recipientAddress = { address1: '', subdistrict: '', district: '', province: '', postalCode: '' };
        let recipientName = reg.clientCompanyName || reg.userDisplayName || '';

        const formData = reg.formData || {};
        for (const key of Object.keys(formData)) {
            const val = formData[key];
            if (val && typeof val === 'object' && ('billingAddress' in val || 'shippingAddress' in val)) {
                const addr = val.isShippingSameAsBilling ? val.billingAddress : (val.shippingAddress || val.billingAddress);
                if (addr) {
                    recipientAddress = {
                        address1: addr.address1 || '',
                        subdistrict: addr.subdistrict || '',
                        district: addr.district || '',
                        province: addr.province || '',
                        postalCode: addr.postalCode || '',
                    };
                }
                break;
            }
        }

        // Get schedule date
        let scheduleDate = '';
        const schedSnap = await getDoc(doc(db, 'trainingSchedules', reg.scheduleId));
        if (schedSnap.exists()) scheduleDate = schedSnap.data().startDate || '';

        const packageData: Omit<DeliveryPackage, 'id'> = {
            registrationId,
            courseId: reg.courseId,
            courseTitle: reg.courseTitle,
            scheduleId: reg.scheduleId,
            scheduleDate,
            clientCompanyName: reg.clientCompanyName || '',
            recipientName,
            recipientAddress,
            overallStatus: items.length > 0 ? 'รอดำเนินการ' : 'ไม่มี',
            items,
            createdAt: now,
            createdBy,
        };

        const pkgRef = await addDoc(collection(db, 'deliveryPackages'), packageData);

        // Back-reference on registration
        await updateDoc(doc(db, 'registrations', registrationId), { deliveryPackageId: pkgRef.id });

        writeAuditLog({
            collectionName: 'deliveryPackages',
            documentId: pkgRef.id,
            action: 'create',
            after: { registrationId, itemCount: items.length },
            performedBy: createdBy,
            note: `สร้างแพ็กเกจจัดส่งสำหรับ ${reg.clientCompanyName || reg.userDisplayName}`,
        });

        revalidatePath('/erp/delivery');
        revalidatePath('/erp/registrations');
        return { success: true, message: 'สร้างแพ็กเกจจัดส่งสำเร็จ', packageId: pkgRef.id };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' };
    }
}

export async function updateDeliveryItemStatus(
    packageId: string,
    itemType: DeliverableType,
    newStatus: DeliveryItemStatus,
    updatedBy: string,
    notes?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const pkgRef = doc(db, 'deliveryPackages', packageId);
        const pkgSnap = await getDoc(pkgRef);
        if (!pkgSnap.exists()) return { success: false, message: 'ไม่พบแพ็กเกจ' };

        const pkg = pkgSnap.data() as DeliveryPackage;
        const now = new Date().toISOString();
        const updatedItems = pkg.items.map(item =>
            item.type === itemType
                ? { ...item, status: newStatus, updatedAt: now, updatedBy, ...(notes != null ? { notes } : {}) }
                : item
        );
        const overallStatus = computeOverallStatus(updatedItems);

        await updateDoc(pkgRef, { items: updatedItems, overallStatus });

        revalidatePath('/erp/delivery');
        return { success: true, message: 'อัปเดตสถานะสำเร็จ' };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' };
    }
}

export async function updatePackageMeta(
    packageId: string,
    data: { trackingNumber?: string; notes?: string }
): Promise<{ success: boolean; message: string }> {
    try {
        await updateDoc(doc(db, 'deliveryPackages', packageId), data);
        revalidatePath('/erp/delivery');
        return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' };
    }
}

export async function batchUpdateSchedulePackages(
    scheduleId: string,
    newStatus: DeliveryItemStatus,
    updatedBy: string
): Promise<{ success: boolean; message: string; count: number }> {
    try {
        const snap = await getDocs(query(collection(db, 'deliveryPackages'), where('scheduleId', '==', scheduleId)));
        if (snap.empty) return { success: true, message: 'ไม่มีแพ็กเกจในรอบนี้', count: 0 };

        const now = new Date().toISOString();
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            const pkg = d.data() as DeliveryPackage;
            const updatedItems = pkg.items.map(item =>
                item.status !== 'ไม่มี' ? { ...item, status: newStatus, updatedAt: now, updatedBy } : item
            );
            batch.update(d.ref, { items: updatedItems, overallStatus: newStatus });
        });
        await batch.commit();

        writeAuditLog({
            collectionName: 'deliveryPackages',
            documentId: scheduleId,
            action: 'update',
            after: { scheduleId, newStatus, count: snap.size },
            performedBy: updatedBy,
            note: `อัปเดตสถานะจัดส่งทั้งรอบ (${snap.size} แพ็กเกจ) → ${newStatus}`,
        });

        revalidatePath('/erp/delivery');
        return { success: true, message: `อัปเดต ${snap.size} แพ็กเกจสำเร็จ`, count: snap.size };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', count: 0 };
    }
}

export async function getDeliveryPackages(filters: {
    status?: DeliveryItemStatus | 'all';
    courseId?: string;
    scheduleId?: string;
}): Promise<{ packages: DeliveryPackage[] }> {
    try {
        let q = query(collection(db, 'deliveryPackages'));
        if (filters.scheduleId) q = query(q, where('scheduleId', '==', filters.scheduleId));
        else if (filters.courseId) q = query(q, where('courseId', '==', filters.courseId));
        if (filters.status && filters.status !== 'all') q = query(q, where('overallStatus', '==', filters.status));
        const snap = await getDocs(q);
        const packages = snap.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryPackage));
        return { packages };
    } catch {
        return { packages: [] };
    }
}
