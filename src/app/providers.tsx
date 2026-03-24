'use client';

import { Toaster } from "@/components/ui/toaster";
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { AuthProvider } from '@/context/auth-context';
import { ConditionalLayout } from '@/components/conditional-layout';
import { PageViewTracker } from '@/components/page-view-tracker';
import { SearchProvider } from "@/context/search-context";
import { SmartSearch } from "@/components/smart-search";
import { FirebaseClientProvider } from "@/firebase";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
      <FirebaseClientProvider>
        <AuthProvider>
          <SearchProvider>
            <PageViewTracker />
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
            <Toaster />
            <BottomNavBar />
            <SmartSearch />
          </SearchProvider>
        </AuthProvider>
      </FirebaseClientProvider>
    )
}
