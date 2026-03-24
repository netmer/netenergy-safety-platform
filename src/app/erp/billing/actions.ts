'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Registration, PaymentRecord } from '@/lib/course-data';
import { createQuotation, createInvoice, createReceipt } from '@/lib/invoicing';
import { nanoid } from 'nanoid';
import { writeAuditLog } from '@/lib/audit';

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

        if (result.success && 'publicUrl' in result && result.publicUrl) {
            await updateDoc(doc(db, 'registrations', registrationId), {
                quotationGenerated: true,
                quotationUrl: result.publicUrl,
                quotationId: ('documentId' in result ? result.documentId : null) || null,
            });
            revalidatePath('/erp/billing');
            revalidatePath('/erp/registrations');
            return { success: true, message: 'สร้างใบเสนอราคาสำเร็จ', publicUrl: result.publicUrl as string };
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

        if (result.success && 'publicUrl' in result && result.publicUrl) {
            await updateDoc(doc(db, 'registrations', registrationId), {
                invoiceGenerated: true,
                invoiceUrl: result.publicUrl,
                invoiceId: ('documentId' in result ? result.documentId : null) || null,
            });
            revalidatePath('/erp/billing');
            revalidatePath('/erp/registrations');
            return { success: true, message: 'สร้างใบแจ้งหนี้สำเร็จ', publicUrl: result.publicUrl as string };
        }
        throw new Error(result.message || 'Failed to create invoice');
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}

export async function generateReceiptAction(registrationId: string): Promise<{ success: boolean; message: string; publicUrl?: string }> {
    try {
        const registration = await getRegistration(registrationId);
        if (!registration.invoiceGenerated) {
            return { success: false, message: 'ต้องสร้างใบแจ้งหนี้ก่อนออกใบเสร็จ' };
        }
        const result = await createReceipt(registration);

        if (result.success && 'publicUrl' in result && result.publicUrl) {
            await updateDoc(doc(db, 'registrations', registrationId), {
                receiptGenerated: true,
                receiptUrl: result.publicUrl,
                receiptId: ('documentId' in result ? result.documentId : null) || null,
            });
            revalidatePath('/erp/billing');
            revalidatePath('/erp/registrations');
            return { success: true, message: 'สร้างใบเสร็จสำเร็จ', publicUrl: result.publicUrl as string };
        }
        throw new Error(result.message || 'Failed to create receipt');
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}

export async function addPaymentRecord(
    registrationId: string,
    payment: Omit<PaymentRecord, 'id' | 'timestamp'>
): Promise<{ success: boolean; message: string }> {
    try {
        const registration = await getRegistration(registrationId);
        const newPayment: PaymentRecord = {
            ...payment,
            id: nanoid(),
            timestamp: new Date().toISOString(),
        };
        const history = [...(registration.paymentHistory || []), newPayment];
        const amountPaid = history.reduce((sum, p) => sum + p.amount, 0);
        const totalAmount = registration.totalAmount || 0;
        const paymentStatus: Registration['paymentStatus'] =
            amountPaid === 0 ? 'unpaid' : amountPaid < totalAmount ? 'partial' : 'paid';

        await updateDoc(doc(db, 'registrations', registrationId), {
            paymentHistory: history,
            amountPaid,
            paymentStatus,
        });

        // Audit log (fire-and-forget)
        writeAuditLog({
            collectionName: 'registrations',
            documentId: registrationId,
            action: 'payment',
            after: { amount: newPayment.amount, method: newPayment.method, paymentStatus },
            performedBy: payment.recordedBy || 'system',
            note: `บันทึกชำระเงิน ${newPayment.amount.toLocaleString()} บาท (${newPayment.method})`,
        });

        revalidatePath('/erp/billing');
        return { success: true, message: 'บันทึกการชำระเงินสำเร็จ' };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}

export async function setRegistrationTotalAmount(registrationId: string, totalAmount: number): Promise<{ success: boolean; message: string }> {
    try {
        const registration = await getRegistration(registrationId);
        const amountPaid = registration.amountPaid || 0;
        const paymentStatus: Registration['paymentStatus'] =
            amountPaid === 0 ? 'unpaid' : amountPaid < totalAmount ? 'partial' : 'paid';

        await updateDoc(doc(db, 'registrations', registrationId), { totalAmount, paymentStatus });
        revalidatePath('/erp/billing');
        return { success: true, message: 'บันทึกยอดรวมสำเร็จ' };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
        return { success: false, message: error };
    }
}
