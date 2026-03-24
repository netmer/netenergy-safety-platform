

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { CertificateTemplate } from '@/lib/course-data';
import { TemplatesClientPage } from './templates-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ManageTemplatesPage() {
  const templatesQuery = query(collection(db, 'certificateTemplates'), orderBy('name'));
  const templatesSnapshot = await getDocs(templatesQuery);
  const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CertificateTemplate));

  return <TemplatesClientPage templates={templates} />;
}
