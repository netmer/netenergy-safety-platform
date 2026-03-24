

import { HistoryClientPage } from './history-client-page';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export const revalidate = 60; // Revalidate every 60 seconds

async function getHistoryPageMetadata() {
    // Fetch only the list of unique company names for the filter dropdown
    // In a very large-scale app, this list could also be paginated or sourced from a summary collection.
    const recordsSnapshot = await getDocs(query(collection(db, 'trainingRecords'), orderBy('companyName')));
    const uniqueCompanies = [...new Set(recordsSnapshot.docs.map(doc => doc.data().companyName as string))].filter(Boolean);
    return { uniqueCompanies };
}

export default async function TrainingHistoryPage() {
    const { uniqueCompanies } = await getHistoryPageMetadata();
    return <HistoryClientPage uniqueCompanies={uniqueCompanies} />;
}
