

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { AppUser, CustomerProfile } from '@/lib/course-data';
import { UsersClientPage } from './users-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ManageUsersPage() {
  const [usersSnapshot, customersSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'users'), orderBy('email'))),
    getDocs(query(collection(db, 'customers'), orderBy('email'))),
  ]);

  const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
  const customers = customersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as CustomerProfile));

  return <UsersClientPage users={users} customers={customers} />;
}
