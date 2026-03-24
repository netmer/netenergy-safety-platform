import { SyncTestClientPage } from './sync-test-client-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ทดสอบการเชื่อมต่อ API | Admin Panel',
  description: 'เครื่องมือสำหรับทดสอบการเชื่อมต่อกับระบบออกเอกสารภายนอก',
};

export default function SyncTestPage() {
    return <SyncTestClientPage />;
}
