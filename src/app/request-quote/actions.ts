'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import type { Course } from '@/lib/course-data';
import { sendEmail, emailTemplates } from '@/lib/mail';
import { createQuotationFromPayload } from '@/lib/invoicing';
import { createSystemNotification } from '@/lib/notifications';

const QuoteFormSchema = z.object({
  courseId: z.string().min(1, 'กรุณาเลือกหลักสูตรที่ท่านสนใจ'),
  attendeeCount: z.coerce.number().min(1, 'กรุณาระบุจำนวนผู้เข้าอบรมอย่างน้อย 1 คน'),
  customerName: z.string().min(1, 'กรุณากรอกชื่อบริษัทหรือหน่วยงานของท่าน'),
  contactName: z.string().min(1, 'กรุณากรอกชื่อผู้ติดต่อ'),
  contactEmail: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  contactPhone: z.string().min(1, 'กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อกลับ'),
  taxId: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  userId: z.string().optional().nullable(),
});

export interface QuoteFormState {
  success: boolean;
  message: string;
  quotationId?: string;
}

export async function requestQuoteAction(
  prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = QuoteFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMsg = validatedFields.error.errors.map(err => err.message).join(', ');
    return { 
        success: false, 
        message: `กรุณาตรวจสอบข้อมูล: ${errorMsg}`
    };
  }
  
  const data = validatedFields.data;

  try {
    // 1. Fetch course details to get the full title and price
    const courseDoc = await getDoc(doc(db, 'courses', data.courseId));
    if (!courseDoc.exists()) {
      return { success: false, message: 'ไม่พบข้อมูลหลักสูตรที่เลือก กรุณาลองใหม่อีกครั้งครับ' };
    }
    const course = courseDoc.data() as Course;

    // 2. Prepare data for 'requestsForQuote' collection (Main CRM)
    const nameParts = data.contactName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';

    const quoteRequestData = {
      courseId: data.courseId,
      organizationName: data.customerName,
      contactPersonFirstName: firstName,
      contactPersonLastName: lastName,
      contactPersonEmail: data.contactEmail,
      contactPersonPhone: data.contactPhone,
      numberOfParticipants: data.attendeeCount,
      additionalRequirements: data.notes || '',
      status: 'New',
      requestDate: new Date().toISOString(),
      submittedByUid: data.userId || null,
      taxId: data.taxId || null,
      address: data.address || null,
      courseTitle: course.title,
    };

    // 3. Save to primary Firestore (This is the source of truth for the admin)
    const docRef = await addDoc(collection(db, 'requestsForQuote'), quoteRequestData);

    // 4. (Background) Try to sync with Quotacraft system
    try {
        await createQuotationFromPayload({
            customerData: {
                customerName: data.customerName,
                taxId: data.taxId || '',
                address: data.address || '',
                contacts: [{
                    name: data.contactName,
                    email: data.contactEmail,
                    phone: data.contactPhone,
                }]
            },
            items: [{
                type: 'Item',
                description: `ค่าธรรมเนียมการอบรมหลักสูตร: ${course.title}`,
                quantity: data.attendeeCount,
                unit: 'ท่าน',
                unitPrice: course.price || 0,
            }],
            notes: data.notes,
            source: 'Quote Request Form',
            sourceRegistrationId: docRef.id,
        });
    } catch (syncError) {
        // Log the error but don't fail the main request
        console.warn("Could not sync to Quotacraft system, but request was saved locally:", syncError);
    }

    // 5. Send Confirmation Email via Firebase Extension
    try {
        const template = emailTemplates.quoteRequestReceived(data.contactName, course.title);
        await sendEmail({
            to: data.contactEmail,
            subject: template.subject,
            html: template.html,
        });
    } catch (emailError) {
        console.warn("Failed to trigger notification email:", emailError);
    }

    // 6. Notify System Admins
    try {
        await createSystemNotification({
            title: 'คำขอใบเสนอราคาใหม่',
            message: `${data.contactName} (${data.customerName}) ขอใบเสนอราคา ${course.title} จำนวน ${data.attendeeCount} ท่าน`,
            type: 'important',
            link: '/admin',
            forRole: 'admin',
            sendEmailTo: 'admin@netenergy-tech.com'
        });
    } catch(err) {
        console.warn('Silent fail on admin notification', err);
    }

    return { 
        success: true, 
        message: 'ได้รับคำขอใบเสนอราคาแล้วครับ ทีมงานจะติดต่อกลับพร้อมส่งเอกสารให้โดยเร็วที่สุด', 
        quotationId: docRef.id 
    };

  } catch (error) {
    console.error("Critical error in requestQuoteAction:", error);
    const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
    return { success: false, message: `ไม่สามารถส่งคำขอได้ในขณะนี้: ${errorMessage}` };
  }
}
