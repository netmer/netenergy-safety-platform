'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/app/admin/analytics/actions';
import { useAuth } from '@/context/auth-context';

export function PageViewTracker() {
    const pathname = usePathname();
    const { user } = useAuth();
    const trackedPathname = useRef<string | null>(null);

    useEffect(() => {
        // Prevent double-tracking on the same path
        if (pathname !== trackedPathname.current) {
            trackedPathname.current = pathname;
            
            // Do not track admin or ERP pages
            if (pathname.startsWith('/admin') || pathname.startsWith('/erp')) {
                return;
            }

            // We use a small timeout to allow the document title to update
            setTimeout(() => {
                trackPageView({
                    path: pathname,
                    referrer: document.referrer,
                    userId: user?.uid,
                });
            }, 100);
        }
    }, [pathname, user]);

    return null; // This component does not render anything
}
