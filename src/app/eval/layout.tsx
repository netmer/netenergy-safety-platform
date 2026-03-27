import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { EmojiPreloader } from '@/components/eval/emoji-face';

export const metadata: Metadata = {
    title: 'แบบประเมิน | NET Safety Platform',
};

export default function EvalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Preload all emoji images so they appear instantly during eval */}
            <EmojiPreloader />
            {children}
            <Toaster />
        </div>
    );
}
