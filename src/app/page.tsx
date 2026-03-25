import { Suspense } from 'react';
import { AnimatedHero } from './_components/animated-hero';
import { FeaturesSection } from './_components/features-section';
import { AnimatedCTA } from './_components/cta-section';
import { StatsSection } from './_components/stats-section';
import { IndustriesSection } from './_components/industries-section';
import { ClientLogoTicker } from './_components/client-ticker';
import { SocialSection } from './_components/social-section';
import { CertificationsSection } from './_components/certifications-section';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import type { Certification, Client } from '@/lib/course-data';

export const metadata = {
  title: 'NET Safety Platform | ศูนย์ฝึกอบรมความปลอดภัยและที่ปรึกษาอันดับ 1 ของไทย',
  description: 'ยกระดับวัฒนธรรมความปลอดภัยให้องค์กรของคุณด้วยทีมผู้เชี่ยวชาญจาก NET เราเปลี่ยนข้อบังคับทางกฎหมายให้เป็นทักษะชีวิต เพื่อปกป้องพนักงานและขับเคลื่อนธุรกิจอย่างยั่งยืน อบรม จป., อบรมความปลอดภัย และงานตรวจสอบครบวงจร',
  keywords: ['อบรมความปลอดภัย', 'อบรม จป', 'จป หัวหน้างาน', 'จป บริหาร', 'ความปลอดภัยในการทำงาน', 'กฎหมายแรงงาน', 'NET Safety', 'Safety Training Thailand', 'In-house training', 'ISO 45001'],
};

export default async function HomePage() {
  const [certsSnapshot, clientsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'certifications'), orderBy('orderIndex'))),
    getDocs(query(collection(db, 'clients'), where('showOnHome', '==', true)))
  ]);

  const certifications = certsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
  const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด (NET Safety)',
    alternateName: 'NET Safety Platform',
    description: 'ผู้นำด้านการฝึกอบรมความปลอดภัยและอาชีวอนามัยในประเทศไทย ที่ได้รับความไว้วางใจจากองค์กรชั้นนำมากว่า 15 ปี',
    url: 'https://netenergy-safety-platform.web.app',
    logo: 'https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '0-2582-2111',
      contactType: 'customer service',
      areaServed: 'TH',
      availableLanguage: 'Thai',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '44/99 หมู่ที่ 9 ตำบลบางพูด อำเภอปากเกร็ด',
      addressLocality: 'จังหวัดนนทบุรี',
      postalCode: '11120',
      addressCountry: 'TH',
    },
    sameAs: [
      'https://www.facebook.com/share/1B8nu1526H/',
      'https://line.me/ti/p/~@net10'
    ]
  };

  return (
    <div className="overflow-x-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <h1 className="sr-only">NET Safety Platform ศูนย์ฝึกอบรมความปลอดภัยและที่ปรึกษาอาชีวอนามัยอันดับ 1 ของประเทศไทย</h1>
      
      <AnimatedHero />
      
      <ClientLogoTicker clients={clients} />

      <FeaturesSection />

      <StatsSection />

      <CertificationsSection certifications={certifications} />

      <IndustriesSection />

      <SocialSection />

      <AnimatedCTA />
    </div>
  );
}