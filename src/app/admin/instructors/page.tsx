

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Instructor } from '@/lib/course-data';
import { InstructorsClientPage } from './instructors-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ManageInstructorsPage() {
  const instructorsQuery = query(collection(db, 'instructors'), orderBy('name'));
  const instructorsSnapshot = await getDocs(instructorsQuery);
  const instructors = instructorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Instructor));

  return <InstructorsClientPage instructors={instructors} />;
}
