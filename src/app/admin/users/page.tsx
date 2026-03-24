

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { AppUser } from '@/lib/course-data';
import { UsersClientPage } from './users-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ManageUsersPage() {
  const usersQuery = query(collection(db, 'users'), orderBy('email'));
  const usersSnapshot = await getDocs(usersQuery);
  const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));

  return <UsersClientPage users={users} />;
}
