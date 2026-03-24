import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const secondaryFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_SECONDARY_FIREBASE_APP_ID,
};

const QUOTACRAFT_APP_NAME = 'quotacraft';

// Initialize the secondary app
function initializeSecondaryApp(): FirebaseApp {
    const apps = getApps();
    const existingApp = apps.find(app => app.name === QUOTACRAFT_APP_NAME);
    if (existingApp) {
        return existingApp;
    }
    
    if (!secondaryFirebaseConfig.projectId) {
        console.error("Quotacraft Firebase config is missing. Operations will likely fail.");
        // This will now throw an error on initializeApp if config is bad, which is intended.
    }
    
    return initializeApp(secondaryFirebaseConfig, QUOTACRAFT_APP_NAME);
}

const quotacraftApp = initializeSecondaryApp();
const quotacraftDb = getFirestore(quotacraftApp);

export { quotacraftApp, quotacraftDb };
