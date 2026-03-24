
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { RegistrationForm } from '@/lib/course-data';
import { FormsClientPage } from '@/app/erp/forms/forms-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ManageAdminFormsPage() {
  noStore();
  const formsQuery = query(collection(db, 'registrationForms'), orderBy('name'));
  const formsSnapshot = await getDocs(formsQuery);
  const forms = formsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationForm));

  // We are now re-using the more feature-complete component from the ERP section.
  return <FormsClientPage forms={forms} />;
}
