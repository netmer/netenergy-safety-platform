
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Sends an email by adding a document to the 'mail' collection.
 * This triggers the "Trigger Email from Firestore" extension.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  try {
    // โครงสร้างข้อมูลที่ Firebase Extension "Trigger Email" คาดหวัง
    const mailData = {
      to: Array.isArray(to) ? to : [to],
      replyTo: replyTo || 'admin@netenergy-tech.com',
      message: {
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''), // แผนสำรองกรณีเปิด HTML ไม่ได้
      },
      // สำคัญ: ใช้ serverTimestamp() เพื่อให้ Extension ทราบลำดับคิวที่ถูกต้อง
      createdAt: serverTimestamp(),
      // เพิ่ม Metadata เพื่อช่วยในการตรวจสอบภายหลัง
      metadata: {
        source: 'nextjs-app-action',
        version: '2.5',
      }
    };

    const docRef = await addDoc(collection(db, 'mail'), mailData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error queueing email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown Error' };
  }
}

/**
 * Professional HTML Email Templates for Safety Training Context
 */
export const emailTemplates = {
    registrationReceived: (userName: string, courseTitle: string) => ({
        subject: `[NET Safety] ได้รับข้อมูลการลงทะเบียนหลักสูตร ${courseTitle} เรียบร้อยแล้ว`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid #2563eb;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #1e293b; margin-top: 0;">สวัสดีคุณ ${userName}</h2>
                <p>ทางทีมงาน <strong>NET Safety Training</strong> ได้รับข้อมูลการลงทะเบียนของคุณเรียบร้อยแล้วครับ ในหลักสูตร:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #2563eb;">
                    <h3 style="margin: 0; color: #2563eb; font-size: 18px;">${courseTitle}</h3>
                </div>
                <p>ขณะนี้ข้อมูลของคุณอยู่ระหว่างการตรวจสอบโดยเจ้าหน้าที่ เราจะแจ้งผลการยืนยันสิทธิ์ให้คุณทราบอีกครั้งผ่านทางอีเมลนี้ครับ</p>
                <p>ระหว่างรอ คุณสามารถเข้าไปตรวจสอบประวัติการสมัครของคุณได้ที่ <a href="https://netenergy-safety-platform.web.app/profile" style="color: #2563eb; text-decoration: underline;">หน้าโปรไฟล์</a> ของคุณครับ</p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 5px;">หากมีข้อสงสัยเพิ่มเติม ติดต่อเราได้ที่</p>
                    <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0;">0-2582-2111</p>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px;">
                    © ${new Date().getFullYear()} Natural Energy Tech Co., Ltd. (Head Office)<br>
                    ผู้นำด้านการฝึกอบรมความปลอดภัยมาตรฐานสากล
                </p>
            </div>
        `
    }),
    statusUpdated: (userName: string, courseTitle: string, statusText: string, statusColor: string = '#2563eb') => ({
        subject: `[NET Safety] อัปเดตสถานะการลงทะเบียน: ${courseTitle}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid ${statusColor};">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #1e293b;">แจ้งการเปลี่ยนแปลงสถานะ</h2>
                <p>สวัสดีคุณ ${userName},</p>
                <p>เรามีการอัปเดตสถานะการลงทะเบียนของคุณสำหรับหลักสูตร <strong>${courseTitle}</strong> ดังนี้:</p>
                <div style="background: #f1f5f9; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 5px;">สถานะปัจจุบัน</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${statusColor};">${statusText}</div>
                </div>
                <p>คุณสามารถดูรายละเอียดเพิ่มเติมและเตรียมตัวก่อนเข้าอบรมได้ที่เมนู "โปรไฟล์ของฉัน" ครับ</p>
                <div style="text-align: center; margin-top: 35px;">
                    <a href="https://netenergy-safety-platform.web.app/profile" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">ดูรายละเอียดที่โปรไฟล์</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">ขอบพระคุณที่ไว้วางใจเลือกใช้บริการจากทีมงาน NET Safety ครับ</p>
            </div>
        `
    }),
    scheduleRescheduled: (userName: string, courseTitle: string, oldDate: string, newDate: string, location: string) => ({
        subject: `[NET Safety] แจ้งเปลี่ยนแปลงวันอบรมหลักสูตร ${courseTitle}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid #d97706;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #1e293b;">แจ้งเปลี่ยนแปลงกำหนดการอบรม</h2>
                <p>เรียนคุณ ${userName},</p>
                <p>ขอแจ้งให้ทราบว่ากำหนดการอบรมหลักสูตร <strong>${courseTitle}</strong> มีการเปลี่ยนแปลงดังนี้:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 10px; overflow: hidden;">
                    <tr style="background: #fef3c7;">
                        <td style="padding: 15px; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; width: 40%;">วันเดิม</td>
                        <td style="padding: 15px; font-weight: bold; color: #92400e; text-decoration: line-through;">${oldDate}</td>
                    </tr>
                    <tr style="background: #dcfce7;">
                        <td style="padding: 15px; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 1px;">วันใหม่</td>
                        <td style="padding: 15px; font-weight: bold; color: #166534; font-size: 18px;">${newDate}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 15px; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 1px;">สถานที่</td>
                        <td style="padding: 15px; color: #1e293b;">${location}</td>
                    </tr>
                </table>
                <p>ขออภัยในความไม่สะดวก หากมีข้อสงสัยหรือต้องการยกเลิก กรุณาติดต่อเราโดยตรงครับ</p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 5px;">ติดต่อสอบถามได้ที่</p>
                    <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0;">0-2582-2111</p>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px;">© ${new Date().getFullYear()} Natural Energy Tech Co., Ltd.</p>
            </div>
        `
    }),
    scheduleCancelled: (userName: string, courseTitle: string, scheduledDate: string, reason?: string) => ({
        subject: `[NET Safety] แจ้งยกเลิกรอบอบรมหลักสูตร ${courseTitle}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid #dc2626;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #dc2626;">แจ้งยกเลิกรอบการอบรม</h2>
                <p>เรียนคุณ ${userName},</p>
                <p>ขอแจ้งให้ทราบว่ารอบการอบรมหลักสูตร <strong>${courseTitle}</strong> วันที่ <strong>${scheduledDate}</strong> ได้ถูกยกเลิกแล้ว</p>
                ${reason ? `<div style="background: #fef2f2; padding: 15px; border-radius: 10px; border-left: 4px solid #dc2626; margin: 20px 0;"><p style="margin: 0; color: #7f1d1d;">สาเหตุ: ${reason}</p></div>` : ''}
                <p>ทางทีมงานจะติดต่อกลับเพื่อจัดรอบอบรมให้ใหม่โดยเร็วที่สุด หรือท่านสามารถลงทะเบียนรอบใหม่ได้ที่เว็บไซต์ของเรา</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://netenergy-safety-platform.web.app/courses" style="background: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ดูรอบอบรมที่เปิดรับ</a>
                </div>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 5px;">ขออภัยในความไม่สะดวก ติดต่อสอบถามได้ที่</p>
                    <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0;">0-2582-2111</p>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px;">© ${new Date().getFullYear()} Natural Energy Tech Co., Ltd.</p>
            </div>
        `
    }),
    attendeeRescheduled: (userName: string, courseTitle: string, movedAttendeeNames: string[], newDate: string, newLocation: string) => ({
        subject: `[NET Safety] แจ้งย้ายรอบผู้อบรม - ${courseTitle}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid #7c3aed;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #1e293b;">แจ้งย้ายรอบผู้อบรม</h2>
                <p>เรียนคุณ ${userName},</p>
                <p>ทางทีมงานได้ดำเนินการย้ายรอบอบรมให้กับผู้เข้าอบรมต่อไปนี้ในหลักสูตร <strong>${courseTitle}</strong>:</p>
                <div style="background: #f5f3ff; padding: 20px; border-radius: 10px; border-left: 4px solid #7c3aed; margin: 20px 0;">
                    <ul style="margin: 0; padding-left: 20px; color: #4c1d95;">
                        ${movedAttendeeNames.map(name => `<li style="margin-bottom: 5px;">${name}</li>`).join('')}
                    </ul>
                </div>
                <p>รอบใหม่: <strong>${newDate}</strong> ที่ <strong>${newLocation}</strong></p>
                <p>หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่ครับ</p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0;">0-2582-2111</p>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px;">© ${new Date().getFullYear()} Natural Energy Tech Co., Ltd.</p>
            </div>
        `
    }),
    bulkScheduleNotice: (courseTitle: string, scheduleDate: string, messageBody: string) => ({
        subject: `[NET Safety] ประกาศสำคัญ - ${courseTitle}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid #0891b2;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #1e293b;">ประกาศจากทีมงาน NET Safety</h2>
                <p>เรื่อง: หลักสูตร <strong>${courseTitle}</strong> รอบวันที่ ${scheduleDate}</p>
                <div style="background: #ecfeff; padding: 20px; border-radius: 10px; border-left: 4px solid #0891b2; margin: 20px 0;">
                    <p style="margin: 0; white-space: pre-line;">${messageBody}</p>
                </div>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 5px;">ติดต่อสอบถามได้ที่</p>
                    <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0;">0-2582-2111</p>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px;">© ${new Date().getFullYear()} Natural Energy Tech Co., Ltd.</p>
            </div>
        `
    }),
    quoteRequestReceived: (contactName: string, courseTitle: string) => ({
        subject: `[NET Safety] ได้รับคำขอใบเสนอราคาสำหรับหลักสูตร ${courseTitle}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; border-top: 5px solid #0891b2;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e" alt="NET Safety" style="max-height: 50px;">
                </div>
                <h2 style="color: #1e293b;">ได้รับคำขอใบเสนอราคาแล้ว</h2>
                <p>เรียนคุณ ${contactName},</p>
                <p>ขอบพระคุณที่สนใจบริการฝึกอบรมจาก <strong>NET Safety Training</strong> ครับ เราได้รับข้อมูลคำขอใบเสนอราคาของคุณสำหรับหลักสูตร:</p>
                <div style="background: #ecfeff; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0891b2;">
                    <h3 style="margin: 0; color: #0891b2; font-size: 18px;">${courseTitle}</h3>
                </div>
                <p>เจ้าหน้าที่ฝ่ายขายกำลังตรวจสอบรายละเอียดและจัดทำเอกสารให้ท่าน และจะจัดส่งให้ทางอีเมลนี้โดยเร็วที่สุด (ปกติภายใน 1 วันทำการ) ครับ</p>
                <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 10px; font-size: 14px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0;">หากต้องการเร่งด่วน หรือต้องการปรับแก้รายละเอียด ท่านสามารถติดต่อฝ่ายขายโดยตรงที่</p>
                    <p style="font-weight: bold; font-size: 16px; margin: 5px 0 0 0; color: #0891b2;">081-234-5678</p>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px;">NET Safety Team - พาร์ทเนอร์ด้านความปลอดภัยที่ยั่งยืนของคุณ</p>
            </div>
        `
    })
};
