import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NET Safety Platform',
    short_name: 'NET Safety',
    description: 'ศูนย์ฝึกอบรมความปลอดภัยมาตรฐานสากลและที่ปรึกษาอาชีวอนามัยอันดับ 1 ของประเทศไทย',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '192x192',
        type: 'image/x-icon',
      },
      {
        src: '/favicon.ico',
        sizes: '512x512',
        type: 'image/x-icon',
      },
    ],
  };
}
