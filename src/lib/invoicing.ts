'use server';

import { db } from './firebase'; // Main DB for course info
import type { Registration, Course, RegistrationFormField } from './course-data';
import { doc, getDoc } from 'firebase/firestore';

// --- Generic Payload Structure matching the API spec ---
export interface QuoteRequestPayload {
  documentType: 'quotation' | 'invoice';
  issuerId: string;
  customerData: {
    customerName: string;
    taxId: string; // Required by API
    branch?: string;
    address?: string;
    contacts: {
        name: string;
        email: string;
        phone: string;
    }[];
  };
  items: {
    type: 'Item' | 'Category';
    description: string;
    quantity?: number;
    unit?: string;
    unitPrice?: string | number;
  }[];
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  vatCalculationType?: 'exclusive' | 'inclusive' | 'none';
  notes?: string;
  source?: string;
  sourceRegistrationId?: string;
}

// Helper to parse price string like "3,500 บาท" or "3500" into a number
function parsePrice(priceString?: string | number): number {
    if (typeof priceString === 'number') return priceString;
    if (!priceString) return 0;
    const justNumbers = priceString.replace(/[^0-9.]/g, '');
    return parseFloat(justNumbers) || 0;
}

/**
 * Calls the external Document Creation API (Quotacraft)
 */
async function callDocumentAPI(payload: QuoteRequestPayload) {
    const apiSecret = process.env.SYNC_API_SECRET || process.env.QUOTACRAFT_API_KEY;
    const apiUrl = process.env.QUOTACRAFT_API_URL || 'https://quotacraft.com/api/sync/create-document';

    if (!apiSecret) {
        throw new Error('System Error: ไม่พบ API Secret Key (SYNC_API_SECRET) ในการตั้งค่าระบบ');
    }

    // Crucial: API requires these specific fields
    if (!payload.issuerId) {
        payload.issuerId = process.env.QUOTACRAFT_ISSUER_ID || 'SYSTEM_DEFAULT';
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiSecret
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            // Surface the specific API error message
            throw new Error(result.message || `API Error: ${response.status} ${response.statusText}`);
        }

        return { 
            success: true, 
            publicUrl: result.publicUrl, 
            documentId: result.id || result.documentId, 
            message: 'สร้างเอกสารสำเร็จ' 
        };
    } catch (error) {
        console.error("API Integration Error:", error);
        throw error;
    }
}

/**
 * Generic function to create documents from a pre-built payload
 */
export async function createDocumentFromPayload(payload: QuoteRequestPayload) {
    try {
        const result = await callDocumentAPI(payload);
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุระหว่างการซิงค์ข้อมูล';
        return { success: false, message: errorMessage };
    }
}

/**
 * Creates a Quotation from a custom payload (Used in Quote Request Form)
 */
export async function createQuotationFromPayload(payload: Omit<QuoteRequestPayload, 'documentType' | 'issuerId'>) {
    const fullPayload: QuoteRequestPayload = {
        ...payload,
        documentType: 'quotation',
        issuerId: process.env.QUOTACRAFT_ISSUER_ID || 'SYSTEM_DEFAULT',
        customerData: {
            ...payload.customerData,
            taxId: payload.customerData.taxId || '-', // Ensure taxId is not undefined
        }
    };
    return await createDocumentFromPayload(fullPayload);
}

// Helper to transform registration data into a generic payload
function registrationToPayload(registration: Registration, course: Course, type: 'quotation' | 'invoice'): QuoteRequestPayload {
    const schema = registration.formSchema;
    const formData = registration.formData;
    const issuerId = process.env.QUOTACRAFT_ISSUER_ID || 'SYSTEM_DEFAULT';

    const findField = (type: string) => schema.find(f => f.type === type);
    
    const coordinatorField = findField('coordinator');
    const addressField = findField('address');
    const attendeeListField = findField('attendee_list');

    const coordinator = coordinatorField ? formData[coordinatorField.id] : {};
    const billingAddressData = addressField ? formData[addressField.id]?.billingAddress : {};
    const attendees = attendeeListField ? formData[attendeeListField.id] || [] : [];
    
    // Try to find Tax ID field by label or from billing data
    const taxIdField = schema.find(f => f.label && f.label.includes('ภาษี'));
    const rawTaxId = taxIdField ? formData[taxIdField.id] : billingAddressData?.taxId;
    const taxId = rawTaxId && String(rawTaxId).trim() !== '' ? String(rawTaxId).trim() : '0000000000000';

    const customerName = registration.clientCompanyName || coordinator?.name || 'บุคคลทั่วไป';
    
    // Flatten address for the API
    const addressString = [
        billingAddressData?.address1,
        billingAddressData?.subdistrict,
        billingAddressData?.district,
        billingAddressData?.province,
        billingAddressData?.postalCode
    ].filter(Boolean).join(', ');

    return {
        documentType: type,
        issuerId: issuerId,
        customerData: {
            customerName: customerName,
            branch: billingAddressData?.branch || 'สำนักงานใหญ่',
            taxId: String(taxId), // Ensure it's a string and never undefined
            address: addressString || 'N/A',
            contacts: [{
                name: coordinator?.name || customerName,
                email: coordinator?.email || registration.userEmail,
                phone: coordinator?.tel || '',
            }]
        },
        items: [{
            type: "Item",
            description: `ค่าธรรมเนียมการอบรมหลักสูตร: ${course.title}`,
            quantity: attendees.length || 1,
            unit: "ท่าน",
            unitPrice: parsePrice(course.price),
        }],
        vatCalculationType: "exclusive",
        notes: `อ้างอิงรายการลงทะเบียนเลขที่: ${registration.id}`,
        source: 'Registration System',
        sourceRegistrationId: registration.id,
    };
}

/**
 * Creates a Quotation for a specific registration
 */
export async function createQuotation(registration: Registration) {
    const courseDoc = await getDoc(doc(db, 'courses', registration.courseId));
    if (!courseDoc.exists()) throw new Error('ไม่พบข้อมูลหลักสูตรที่เกี่ยวข้อง');
    const course = courseDoc.data() as Course;

    const payload = registrationToPayload(registration, course, 'quotation');
    return await createDocumentFromPayload(payload);
}

/**
 * Creates an Invoice for a specific registration
 */
export async function createInvoice(registration: Registration) {
    const courseDoc = await getDoc(doc(db, 'courses', registration.courseId));
    if (!courseDoc.exists()) throw new Error('ไม่พบข้อมูลหลักสูตรที่เกี่ยวข้อง');
    const course = courseDoc.data() as Course;
    
    const payload = registrationToPayload(registration, course, 'invoice');
    return await createDocumentFromPayload(payload);
}
