
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { AppUser } from '@/lib/course-data';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && user.email) {
        
        // Special case to ensure training@netenergy-tech.com and admin@netenergy-tech.com are admins
        if (user.email === 'training@netenergy-tech.com' || user.email === 'admin@netenergy-tech.com') {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists() || userSnap.data().role !== 'admin') {
                const adminProfile: Omit<AppUser, 'uid'> = {
                    email: user.email,
                    displayName: user.displayName || 'Training Admin',
                    photoURL: user.photoURL || '',
                    role: 'admin',
                };
                await setDoc(userRef, adminProfile);
            }
        }
        
        // Since user profiles might be created by an admin before the user logs in,
        // we should query by email to find their profile document.
        const usersRef = collection(db, 'users');
        // We now have a UID, so we can check for that document first.
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
           setProfile({ uid: userDocSnap.id, ...userDocSnap.data() } as AppUser);
        } else {
            // Fallback to email query for users created by other means
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              setProfile({ uid: userDoc.id, ...userDoc.data() } as AppUser);
            } else {
              // If no profile found, they are just a regular user with no special roles.
              // For this app, we assume only users with a profile doc can access special areas.
              setProfile(null);
            }
        }
      } else {
        // User is signed out
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
