import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Throw a more descriptive error if the config is missing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    // In a server environment, this will stop the build/boot process.
    // In the browser, it will be caught by an error boundary.
    throw new Error('Firebase configuration is missing. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set in your .env file and the server has been restarted.');
}


function initializeFirebaseApp(config: any, name?: string): FirebaseApp {
    const apps = getApps();
    if (name) {
        const namedApp = apps.find(app => app.name === name);
        if (namedApp) {
            return namedApp;
        }
        return initializeApp(config, name);
    }
    
    if (apps.length > 0) {
        return getApp();
    }
    return initializeApp(config);
}

// --- Main App (default) ---
const app = initializeFirebaseApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);


export { app, db, auth, storage };
