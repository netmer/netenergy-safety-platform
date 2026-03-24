import type { Metadata } from 'next';
import { Inter, Prompt, Tangerine } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-prompt',
  display: 'swap',
});

const tangerine = Tangerine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-art',
  display: 'swap',
});


export const metadata: Metadata = {
  metadataBase: new URL('https://netenergy-safety-platform.web.app'),
  title: {
    default: 'NET Safety Platform | ผู้นำด้านการอบรมความปลอดภัยมาตรฐานสากล',
    template: '%s | NET Safety Platform'
  },
  description: 'ยกระดับวัฒนธรรมความปลอดภัยให้องค์กรของคุณด้วยทีมผู้เชี่ยวชาญจาก NET เราเปลี่ยนข้อบังคับทางกฎหมายให้เป็นทักษะชีวิต เพื่อปกป้องพนักงานและขับเคลื่อนธุรกิจอย่างยั่งยืน อบรม จป., อบรมความปลอดภัย และงานตรวจสอบครบวงจร',
  keywords: ['อบรมความปลอดภัย', 'อบรม จป', 'จป หัวหน้างาน', 'จป บริหาร', 'ความปลอดภัยในการทำงาน', 'กฎหมายแรงงาน', 'NET Safety', 'Safety Training Thailand', 'In-house training'],
  authors: [{ name: 'NET Safety Team' }],
  creator: 'Natural Energy Tech Co., Ltd.',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://netenergy-safety-platform.web.app',
    siteName: 'NET Safety Platform',
    images: [
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/hero.png?alt=media&token=1f2fd308-ddc4-49db-a9ad-2a479244779c',
        width: 1200,
        height: 630,
        alt: 'NET Safety Platform - ศูนย์ฝึกอบรมความปลอดภัยอันดับ 1',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NET Safety Platform | ศูนย์ฝึกอบรมความปลอดภัยครบวงจร',
    description: 'เพราะความปลอดภัยคือหัวใจของความสำเร็จ ยกระดับมาตรฐานองค์กรของคุณวันนี้ด้วยหลักสูตรที่ได้รับรองตามกฎหมาย',
    images: ['https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/hero.png?alt=media&token=1f2fd308-ddc4-49db-a9ad-2a479244779c'],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${prompt.variable} ${tangerine.variable}`} suppressHydrationWarning>
      <head />
      <body className="font-body antialiased min-h-screen bg-background flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
