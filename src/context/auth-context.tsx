
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { AppUser, CustomerProfile } from '@/lib/course-data';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  customerProfile: CustomerProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  customerProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
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

        // Check /users collection first (staff accounts)
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          // Staff user found — set profile, skip customer check
          setProfile({ uid: userDocSnap.id, ...userDocSnap.data() } as AppUser);
          setCustomerProfile(null);
        } else {
          // Fallback: check by email for staff pre-created before first login
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setProfile({ uid: userDoc.id, ...userDoc.data() } as AppUser);
            setCustomerProfile(null);
          } else {
            // Not a staff member — handle as customer
            setProfile(null);

            const customerDocRef = doc(db, 'customers', user.uid);
            const customerDocSnap = await getDoc(customerDocRef);

            if (customerDocSnap.exists()) {
              setCustomerProfile({ uid: customerDocSnap.id, ...customerDocSnap.data() } as CustomerProfile);
            } else {
              // First-time customer sign-in — auto-create customer profile
              const newCustomer: Omit<CustomerProfile, 'uid'> = {
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                createdAt: new Date().toISOString(),
                source: 'google_oauth',
              };
              await setDoc(customerDocRef, newCustomer);
              setCustomerProfile({ uid: user.uid, ...newCustomer });
            }
          }
        }
      } else {
        // User is signed out
        setProfile(null);
        setCustomerProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, customerProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
