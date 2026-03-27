
'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isErpPage = pathname.startsWith('/erp');
    const isAdminPage = pathname.startsWith('/admin');
    const isExamPage = pathname.startsWith('/exam');
    const isEvalPage = pathname.startsWith('/eval');
    const isHomePage = pathname === '/';

    // On ERP, Admin, Exam, or Eval pages, we don't render the public header and footer
    if (isErpPage || isAdminPage || isExamPage || isEvalPage) {
        return <main className="flex-grow">{children}</main>;
    }
    
    // We use a stable pathname-based check for the container class to avoid hydration mismatch.
    // pathname is available on the server in Next.js 15.
    return (
        <>
            <Header />
            <main className={cn(
                "flex-grow",
                !isHomePage && "container mx-auto px-4"
            )}>
                {children}
            </main>
            <Footer />
        </>
    );
}
