

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Client } from '@/lib/course-data';
import { ClientsClientPage } from './clients-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ManageClientsPage() {
  const clientsQuery = query(collection(db, 'clients'), orderBy('companyName'));
  const clientsSnapshot = await getDocs(clientsQuery);
  const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));

  return <ClientsClientPage clients={clients} />;
}
