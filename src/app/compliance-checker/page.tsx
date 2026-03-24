import { ComplianceCheckerForm } from '@/components/compliance-checker-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI แนะนำหลักสูตร | NetEnergy Safety Platform',
  description: 'ให้ AI ของเราช่วยวิเคราะห์และแนะนำหลักสูตรอบรมด้านความปลอดภัยที่จำเป็นสำหรับองค์กรของคุณโดยเฉพาะ จากข้อมูลประเภทธุรกิจ, จำนวนพนักงาน, และปัจจัยเสี่ยง',
};

export default function ComplianceCheckerPage() {
  return (
    <div className="py-12 md:py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">
          เครื่องมือตรวจสอบหลักสูตรอบรมที่เหมาะสำหรับคุณ
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          ไม่แน่ใจว่าองค์กรของคุณต้องจัดอบรมหลักสูตรใดบ้าง? ให้ AI ของเราช่วยวิเคราะห์และแนะนำหลักสูตรที่จำเป็นสำหรับคุณโดยเฉพาะ
        </p>
      </div>
      <ComplianceCheckerForm />
    </div>
  );
}
