'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserAuthNav } from '@/components/auth/user-auth-nav';
import Image from 'next/image';
import { HeaderNavItems } from './header-nav-items';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Search } from 'lucide-react';
import { useSearch } from '@/context/search-context';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function Header() {
  const { setIsOpen } = useSearch();
  const { scrollY } = useScroll();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    
    if (latest > previous && latest > 150) {
        setHidden(true);
    } else {
        setHidden(false);
    }

    if (latest > 20) {
        setScrolled(true);
    } else {
        setScrolled(false);
    }
  });

  const isHomePage = pathname === '/';
  const isScrolledEffect = mounted ? scrolled : false;

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      initial={false}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        !mounted 
          ? (isHomePage ? "bg-transparent" : "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b")
          : isScrolledEffect 
            ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-md py-2" 
            : isHomePage 
                ? "bg-transparent border-transparent py-4" 
                : "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/20 py-3"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex h-14 items-center justify-between">
        {/* Logo Section - Professional Badge Style for dark backgrounds */}
        <Link href="/" className="flex items-center space-x-2 group relative z-[60] shrink-0">
          <div className={cn(
              "relative transition-all duration-500 group-hover:scale-105 p-1.5 rounded-xl",
              isHomePage && !isScrolledEffect ? "bg-white shadow-xl shadow-black/20" : "bg-transparent"
          )}>
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e"
                alt="NET Safety Logo"
                width={160}
                height={54}
                className="h-8 md:h-11 w-auto transition-all duration-500"
                priority
              />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <div className={cn(
              "px-4 py-1.5 rounded-2xl transition-all duration-500",
              !mounted 
                ? "bg-transparent" 
                : isScrolledEffect 
                    ? "bg-black/5 dark:bg-white/5" 
                    : isHomePage 
                        ? "bg-black/20 backdrop-blur-md border border-white/10 shadow-lg" 
                        : "bg-black/5 dark:bg-white/5 border border-transparent"
          )}>
            <HeaderNavItems scrolled={isScrolledEffect} isHomePage={isHomePage} />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 md:gap-4 relative z-[60]">
           <div className={cn(
               "flex items-center gap-0.5 md:gap-1 rounded-full px-1.5 md:px-2 py-1 transition-all duration-500 border",
               !mounted 
                ? "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/30"
                : isScrolledEffect 
                  ? "bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700" 
                  : isHomePage
                      ? "bg-black/40 border-white/10 backdrop-blur-md shadow-lg"
                      : "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/30 dark:border-slate-700/30"
           )}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(true)}
                    aria-label="Search"
                    className={cn(
                        "rounded-full w-8 h-8 md:w-9 md:h-9 transition-colors",
                        isScrolledEffect 
                            ? "text-slate-900 dark:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50" 
                            : isHomePage 
                                ? "text-white hover:bg-white/20" 
                                : "text-slate-900 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                >
                    <Search className="h-4 w-4 md:h-[1.1rem] md:w-[1.1rem]" />
                </Button>
                
                <div className={cn(
                    "w-px h-4 mx-0.5 md:mx-1 transition-colors duration-500", 
                    isScrolledEffect ? "bg-slate-300 dark:bg-slate-700" : isHomePage ? "bg-white/20" : "bg-black/10 dark:bg-white/10"
                )} />

                <div className={cn(
                    "transition-colors duration-500 scale-90 md:scale-100",
                    isScrolledEffect 
                        ? "text-slate-900 dark:text-slate-100" 
                        : isHomePage 
                            ? "text-white" 
                            : "text-slate-900 dark:text-slate-100"
                )}>
                     <ThemeToggle />
                </div>
           </div>
           
           <div className="flex items-center">
                <UserAuthNav scrolled={isScrolledEffect} isHomePage={isHomePage} />
           </div>
        </div>
      </div>
    </motion.header>
  );
}
