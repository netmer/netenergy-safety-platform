
'use client';

import { Menu, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import React from 'react';
import { BottomNavItems } from './bottom-nav-items';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


export function BottomNavBar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Close the drawer when navigation occurs
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);
  
  // Hide on admin/erp/exam pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/erp') || pathname.startsWith('/exam') || pathname.startsWith('/eval')) {
    return null;
  }

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 w-full h-[80px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-50 pb-safe-area-inset-bottom shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <nav className="grid h-full grid-cols-4 items-center justify-items-center px-2">
          <BottomNavItems />
          
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
                <button
                    className="flex flex-col items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 h-full w-full hover:text-primary active:scale-95 transition-all"
                >
                    <div className={`p-1 rounded-xl transition-all ${isOpen ? 'bg-primary/10 text-primary' : ''}`}>
                      <Menu className="h-6 w-6" />
                    </div>
                    <span>เมนู</span>
                </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row justify-between items-center">
                <DrawerTitle className="text-lg font-bold">เมนูทั้งหมด</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </DrawerHeader>
              <div className="p-4 overflow-y-auto flex-1">
                 <div className="grid grid-cols-2 gap-3">
                    <BottomNavItems isDrawer />
                 </div>
                 <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-sm text-slate-500 mb-2">ต้องการความช่วยเหลือ?</p>
                    <Button asChild className="w-full rounded-lg">
                        <Link href="/contact">ติดต่อเจ้าหน้าที่</Link>
                    </Button>
                 </div>
              </div>
            </DrawerContent>
          </Drawer>
        </nav>
      </div>
      {/* Spacer to prevent content from being hidden behind the nav bar on mobile */}
      <div className="h-[80px] md:hidden" />
    </>
  );
}
