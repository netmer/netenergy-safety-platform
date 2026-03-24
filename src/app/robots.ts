import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/erp/', '/profile/'],
    },
    sitemap: 'https://netenergy-safety-platform.web.app/sitemap.xml',
  };
}
