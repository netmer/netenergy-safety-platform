'use server';

import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

export async function trackPageView(data: { path: string; referrer: string; userId?: string | null }) {
    if (!data.path) return;

    try {
        await addDoc(collection(db, 'analyticsEvents'), {
            eventType: 'pageview',
            path: data.path,
            referrer: data.referrer,
            userId: data.userId || null,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error tracking page view:', error);
    }
}
