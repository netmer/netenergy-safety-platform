
'use server';

import type { TestResult, TestState } from './actions'; // Keep type definitions
import { createQuotation, createInvoice } from '@/lib/invoicing';
import { doc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Registration } from '@/lib/course-data';


async function getDummyRegistration(): Promise<Registration | null> {
    const registrationsQuery = query(collection(db, 'registrations'), orderBy('registrationDate', 'desc'), limit(1));
    const snapshot = await getDocs(registrationsQuery);
    if (snapshot.empty) {
        return null;
    }
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Registration;
}


export async function runConnectionTest(prevState: TestState, formData: FormData): Promise<TestState> {
    const logs: TestResult[] = [];
    
    // Step 1: Check primary environment variables
    logs.push({ step: 'ตรวจสอบ Environment Variables (Primary)', status: 'info', details: 'เริ่มต้นการตรวจสอบโปรเจกต์หลัก...' });
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        logs.push({ step: 'Primary Project ID', status: 'failure', details: 'ไม่ได้ตั้งค่า Project ID ของโปรเจกต์หลัก' });
        return { logs, overallStatus: 'failure' };
    }
    logs.push({ step: 'Primary Project ID', status: 'success', details: `พบ Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}` });


    // Step 2: Check secondary (Quotacraft) environment variables
    logs.push({ step: 'ตรวจสอบ Environment Variables (Secondary)', status: 'info', details: 'เริ่มต้นการตรวจสอบโปรเจกต์ใบแจ้งหนี้...' });

    if (!process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_PROJECT_ID) {
        logs.push({ step: 'Secondary Project ID', status: 'failure', details: 'ไม่ได้ตั้งค่า Project ID ของโปรเจกต์ใบแจ้งหนี้ (Quotacraft)' });
        return { logs, overallStatus: 'failure' };
    }
    logs.push({ step: 'Secondary Project ID', status: 'success', details: `พบ Project ID: ${process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_PROJECT_ID}` });

    if (!process.env.QUOTACRAFT_ISSUER_ID) {
        logs.push({ step: 'QUOTACRAFT_ISSUER_ID', status: 'failure', details: 'ไม่ได้ตั้งค่า Issuer ID ในไฟล์ .env' });
        return { logs, overallStatus: 'failure' };
    }
    logs.push({ step: 'QUOTACRAFT_ISSUER_ID', status: 'success', details: `พบ Issuer ID: ${process.env.QUOTACRAFT_ISSUER_ID}` });

    // Step 3: Find a registration to use for the test
    logs.push({ step: 'ค้นหาข้อมูลลงทะเบียนล่าสุดเพื่อใช้ทดสอบ', status: 'info', details: 'กำลังค้นหา...' });
    const dummyRegistration = await getDummyRegistration();
    if (!dummyRegistration) {
        logs.push({ step: 'ค้นหาข้อมูลลงทะเบียน', status: 'failure', details: 'ไม่พบข้อมูลการลงทะเบียนในระบบเพื่อใช้ทดสอบ กรุณาสร้างการลงทะเบียนอย่างน้อย 1 รายการ' });
        return { logs, overallStatus: 'failure' };
    }
    logs.push({ step: 'ค้นหาข้อมูลลงทะเบียน', status: 'success', details: `ใช้ข้อมูลจากการลงทะเบียน ID: ${dummyRegistration.id}` });

    // Step 4: Test Quotation creation
    try {
        logs.push({ step: 'ทดสอบการสร้างใบเสนอราคา (Quotation)', status: 'info', details: 'กำลังส่งข้อมูลไปยัง Firestore ของ Quotacraft...' });
        const quotationResult = await createQuotation(dummyRegistration);
        logs.push({ step: 'ผลการสร้างใบเสนอราคา', status: 'success', details: quotationResult.message, response: quotationResult });
    } catch(e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        logs.push({ step: 'ผลการสร้างใบเสนอราคา', status: 'failure', details: `เกิดข้อผิดพลาด: ${error}` });
        return { logs, overallStatus: 'failure' };
    }

    // Step 5: Test Invoice creation
    try {
        logs.push({ step: 'ทดสอบการสร้างใบแจ้งหนี้ (Invoice)', status: 'info', details: 'กำลังส่งข้อมูลไปยัง Firestore ของ Quotacraft...' });
        const invoiceResult = await createInvoice(dummyRegistration);
        logs.push({ step: 'ผลการสร้างใบแจ้งหนี้', status: 'success', details: invoiceResult.message, response: invoiceResult });
    } catch(e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        logs.push({ step: 'ผลการสร้างใบแจ้งหนี้', status: 'failure', details: `เกิดข้อผิดพลาด: ${error}` });
        return { logs, overallStatus: 'failure' };
    }

    logs.push({ step: 'สรุปผล', status: 'success', details: 'การเชื่อมต่อและสร้างเอกสารในฐานข้อมูลของ Quotacraft ทำงานได้ถูกต้อง' });
    return { logs, overallStatus: 'success' };
}
