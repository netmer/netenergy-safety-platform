'use server';

import { sendEmail } from '@/lib/mail';
import { z } from 'zod';

const TestEmailSchema = z.object({
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
});

export type TestEmailState = {
  message?: string;
  success?: boolean;
};

export async function sendTestEmail(prevState: TestEmailState, formData: FormData): Promise<TestEmailState> {
  const validatedFields = TestEmailSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { 
      message: validatedFields.error.flatten().fieldErrors.email?.[0] || 'ข้อมูลไม่ถูกต้อง', 
      success: false 
    };
  }

  const targetEmail = validatedFields.data.email;

  try {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">ยินดีด้วย! ระบบส่งอีเมลของคุณทำงานแล้ว</h2>
        <p>นี่คืออีเมลทดสอบจากระบบ <strong>NET Safety Platform</strong></p>
        <p>หากคุณได้รับข้อความนี้ แสดงว่าการเชื่อมต่อระหว่างเว็บไซต์และ Firebase Extension ทำงานได้อย่างถูกต้องครับ</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">ส่งเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
      </div>
    `;

    const result = await sendEmail({
      to: targetEmail,
      subject: '🧪 [Test] ทดสอบระบบส่งอีเมลจาก NET Safety',
      html: html,
    });

    if (result.success) {
      return { message: `บันทึกคำขอส่งเมลไปยัง ${targetEmail} เรียบร้อยแล้ว โปรดตรวจสอบที่คอลเลกชัน 'mail' ใน Firestore`, success: true };
    } else {
      throw new Error('Failed to add document to Firestore');
    }
  } catch (error) {
    return { message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Firestore', success: false };
  }
}
