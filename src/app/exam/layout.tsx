import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
    title: 'แบบทดสอบ | NET Safety Platform',
};

export default function ExamLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {children}
            <Toaster />
        </div>
    );
}
