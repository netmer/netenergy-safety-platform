'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'net-cookie-consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === null) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="ความเป็นส่วนตัวและคุกกี้"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 md:px-6 md:pb-6"
        >
          <div className="mx-auto max-w-screen-xl">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-slate-900/20 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">

              {/* Icon */}
              <div className="shrink-0 p-2.5 rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>

              {/* Text */}
              <div className="flex-grow min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                  เว็บไซต์นี้ใช้คุกกี้
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งานและวิเคราะห์การเข้าชมเว็บไซต์{' '}
                  <Link
                    href="/privacy-policy"
                    className="underline underline-offset-2 hover:text-primary transition-colors"
                  >
                    อ่านนโยบายความเป็นส่วนตัว
                  </Link>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  className="flex-1 sm:flex-none rounded-xl h-10 text-xs font-bold border-2"
                >
                  ปฏิเสธ
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none rounded-xl h-10 text-xs font-bold shadow-lg shadow-primary/20"
                >
                  ยอมรับทั้งหมด
                </Button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
