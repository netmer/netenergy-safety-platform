import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { AppNotificationType, AppUser } from './course-data';
import { sendEmail } from './mail';

/**
 * Creates a global notification that appears in the ERP Bell.
 * If `sendEmailTo` is provided and the notification is 'important', an email will also be dispatched.
 */
export async function createSystemNotification({
    title,
    message,
    type = 'info',
    forRole = 'all',
    link,
    sendEmailTo
}: {
    title: string;
    message: string;
    type?: AppNotificationType;
    forRole?: AppUser['role'] | 'all';
    link?: string;
    sendEmailTo?: string | string[];
}) {
    try {
        const notifData = {
            title,
            message,
            type,
            forRole,
            link: link || null,
            read: false,
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'notifications'), notifData);

        // Also trigger email if it's highly important and recipient is specified
        if (sendEmailTo && (type === 'important' || type === 'error')) {
            await sendEmail({
                to: sendEmailTo,
                subject: `📢 [NET System Alert] ${title}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border-left: 5px solid ${type === 'error' ? '#e11d48' : '#9333ea'}; background: #f8fafc; border-radius: 8px;">
                        <h2 style="margin-top: 0; color: #0f172a;">${title}</h2>
                        <p style="font-size: 16px; color: #334155;">${message}</p>
                        ${link ? `<a href="https://netenergy-safety-platform.web.app${link}" style="display:inline-block; margin-top:20px; padding: 10px 20px; background: #2563eb; color:white; text-decoration: none; border-radius: 6px;">ตรวจสอบรายละเอียด</a>` : ''}
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 30px;">This is an automated system notification.</p>
                    </div>
                `
            });
        }

        return { success: true, id: docRef.id };
    } catch (e: any) {
        console.error("Failed to create system notification:", e);
        return { success: false, error: e.message };
    }
}
