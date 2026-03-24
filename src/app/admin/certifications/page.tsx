import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Certification } from '@/lib/course-data';
import { CertificationsClientPage } from './certifications-client-page';
import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';

export const metadata: Metadata = {
  title: 'จัดการใบรับรองศูนย์ | Admin Panel',
};

export default async function ManageCertificationsPage() {
  noStore();
  try {
    const certsSnapshot = await getDocs(query(collection(db, 'certifications'), orderBy('orderIndex', 'asc')));
    
    // EXTREMELY STRICT SERIALIZATION: 
    // Ensuring everything is a plain object with primitive types for Next.js hydration.
    const certifications: Certification[] = certsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: String(doc.id),
        title: String(data.title || ''),
        issuer: String(data.issuer || ''),
        image: String(data.image || ''),
        hint: String(data.hint || ''),
        orderIndex: Number(data.orderIndex || 0),
      };
    });

    return <CertificationsClientPage certifications={JSON.parse(JSON.stringify(certifications))} />;
  } catch (error) {
    console.error("Failed to fetch certifications:", error);
    return (
      <div className="p-8 text-center bg-destructive/10 rounded-xl m-4">
        <h1 className="text-2xl font-bold text-destructive">เกิดข้อผิดพลาดในการโหลดข้อมูล</h1>
        <p className="text-muted-foreground mt-2">โปรดรีเฟรชหน้าจอ หรือลองใหม่อีกครั้งในภายหลัง</p>
      </div>
    );
  }
}
