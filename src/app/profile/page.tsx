
import { Metadata } from 'next';
import { ProfileClientPage } from './profile-client-page';

export const metadata: Metadata = {
  title: 'โปรไฟล์ของฉัน | NetEnergy Safety Platform',
  description: 'ดูโปรไฟล์และประวัติการลงทะเบียนอบรมของคุณ',
};

export default function ProfilePage() {
  return <ProfileClientPage />;
}
