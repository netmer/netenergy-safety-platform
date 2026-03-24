'use server';

import { sendEmail, emailTemplates } from '@/lib/mail';
import { z } from 'zod';

const TestEmailSchema = z.object({
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  templateType: z.string().default('basic'),
});

export type TestEmailState = {
  message?: string;
  success?: boolean;
};

export async function sendTestEmail(prevState: TestEmailState, formData: FormData): Promise<TestEmailState> {
  const validatedFields = TestEmailSchema.safeParse({
    email: formData.get('email'),
    templateType: formData.get('templateType') || 'basic',
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.flatten().fieldErrors.email?.[0] || 'ข้อมูลไม่ถูกต้อง',
      success: false
    };
  }

  const { email: targetEmail, templateType } = validatedFields.data;

  try {
    let subject: string;
    let html: string;

    switch (templateType) {
      case 'registrationReceived': {
        const tpl = emailTemplates.registrationReceived('ลูกค้าทดสอบ', 'หลักสูตรทดสอบความปลอดภัย');
        subject = tpl.subject; html = tpl.html; break;
      }
      case 'statusUpdated': {
        const tpl = emailTemplates.statusUpdated('ลูกค้าทดสอบ', 'หลักสูตรทดสอบ', 'ได้รับการยืนยันแล้ว', '#16a34a');
        subject = tpl.subject; html = tpl.html; break;
      }
      case 'scheduleRescheduled': {
        const tpl = emailTemplates.scheduleRescheduled('ลูกค้าทดสอบ', 'หลักสูตรทดสอบ', '1 มกราคม 2568', '15 กุมภาพันธ์ 2568', 'อาคาร NET สำนักงานใหญ่');
        subject = tpl.subject; html = tpl.html; break;
      }
      case 'scheduleCancelled': {
        const tpl = emailTemplates.scheduleCancelled('ลูกค้าทดสอบ', 'หลักสูตรทดสอบ', '1 มกราคม 2568', 'จำนวนผู้สมัครไม่ถึงเกณฑ์');
        subject = tpl.subject; html = tpl.html; break;
      }
      case 'attendeeRescheduled': {
        const tpl = emailTemplates.attendeeRescheduled('ลูกค้าทดสอบ', 'หลักสูตรทดสอบ', ['นายสมชาย ใจดี', 'นางสาวสมหญิง รักดี'], '20 กุมภาพันธ์ 2568', 'ห้อง A ชั้น 3');
        subject = tpl.subject; html = tpl.html; break;
      }
      case 'bulkScheduleNotice': {
        const tpl = emailTemplates.bulkScheduleNotice('หลักสูตรทดสอบ', '1 มกราคม 2568', 'นี่คือข้อความทดสอบจากระบบ\nกรุณาเตรียมเอกสารให้พร้อม\nขอบคุณครับ');
        subject = '[TEST] ' + tpl.subject; html = tpl.html; break;
      }
      case 'quoteRequestReceived': {
        const tpl = emailTemplates.quoteRequestReceived('ลูกค้าทดสอบ', 'หลักสูตรทดสอบ');
        subject = tpl.subject; html = tpl.html; break;
      }
      default: {
        subject = '[Test] ทดสอบระบบส่งอีเมลจาก NET Safety';
        html = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">ยินดีด้วย! ระบบส่งอีเมลทำงานแล้ว</h2>
            <p>นี่คืออีเมลทดสอบจากระบบ <strong>NET Safety Platform</strong></p>
            <p>หากคุณได้รับข้อความนี้ แสดงว่าการเชื่อมต่อทำงานได้อย่างถูกต้องครับ</p>
            <p style="font-size: 12px; color: #666;">ส่งเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
          </div>
        `;
      }
    }

    const result = await sendEmail({ to: targetEmail, subject, html });

    if (result.success) {
      return { message: `ส่งอีเมล Template "${templateType}" ไปยัง ${targetEmail} เรียบร้อยแล้ว`, success: true };
    } else {
      throw new Error('Failed to add document to Firestore');
    }
  } catch (error) {
    return { message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Firestore', success: false };
  }
}
