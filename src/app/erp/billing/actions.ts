'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Registration } from '@/lib/course-data';
import { createQuotation, createInvoice } from '@/lib/invoicing';

async function getRegistration(id: string): Promise<Registration> {
    const regDoc = await getDoc(doc(db, 'registrations', id));
    if (!regDoc.exists()) {
        throw new Error("Registration not found");
    }
    return { id: regDoc.id, ...regDoc.data() } as Registration;
}

export async function generateQuotationAction(registrationId: string): Promise<{ success: boolean; message: string; publicUrl?: string }> {
    try {
        const registration = await getRegistration(registrationId);
        const result = await createQuotation(registration);

        if (result.success && result.publicUrl) {
            await updateDoc(doc(db, 'registrations', registrationId), {
                quotationGenerated: true,
                quotationUrl: result.publicUrl,
                quotationId: result.documentId || null,
            });
            revalidatePath('/erp/billing');
            revalidatePath('/erp/registrations');
            return { success: true, message: 'สร้างใบเสนอราคาสำเร็จ', publicUrl: result.publicUrl };
        }
        throw new Error(result.message || 'Failed to create quotation');
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}

export async function generateInvoiceAction(registrationId: string): Promise<{ success: boolean; message: string; publicUrl?: string }> {
    try {
        const registration = await getRegistration(registrationId);
        const result = await createInvoice(registration);
        
        if (result.success && result.publicUrl) {
            await updateDoc(doc(db, 'registrations', registrationId), {
                invoiceGenerated: true,
                invoiceUrl: result.publicUrl,
                invoiceId: result.documentId || null,
            });
            revalidatePath('/erp/billing');
            revalidatePath('/erp/registrations');
            return { success: true, message: 'สร้างใบแจ้งหนี้สำเร็จ', publicUrl: result.publicUrl };
        }
        throw new Error(result.message || 'Failed to create invoice');
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}
