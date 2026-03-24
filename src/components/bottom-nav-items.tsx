
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Phone, Briefcase, History, Newspaper, Info, Search, ShieldCheck, UserCircle, SearchCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { useSearch } from '@/context/search-context';

const mainNavItems = [
  { label: 'หน้าแรก', href: '/', icon: Home },
  { label: 'หลักสูตร', href: '/courses', icon: BookOpen },
  { label: 'ค้นหา', href: '#search', icon: Search, isAction: true },
];

const drawerItems = [
    { label: 'หน้าแรก', href: '/', icon: Home },
    { label: 'หลักสูตรทั้งหมด', href: '/courses', icon: BookOpen },
    { label: 'งานตรวจสอบ', href: '/consulting', icon: ShieldCheck },
    { label: 'ประวัติการอบรม', href: '/training-history', icon: SearchCode },
    { label: 'ข่าวสาร & บทความ', href: '/blog', icon: Newspaper },
    { label: 'เกี่ยวกับเรา', href: '/about', icon: Info },
    { label: 'ติดต่อเรา', href: '/contact', icon: Phone },
    { label: 'โปรไฟล์ของฉัน', href: '/profile', icon: UserCircle },
];

interface BottomNavItemsProps {
    isDrawer?: boolean;
}

export function BottomNavItems({ isDrawer = false }: BottomNavItemsProps) {
    const pathname = usePathname();
    const { setIsOpen } = useSearch();

    const isNavItemActive = (href: string) => {
        if (href === '/') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    if (isDrawer) {
        return (
             <>
                {drawerItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-200",
                            isNavItemActive(item.href) 
                                ? 'bg-primary/5 border-primary/20 text-primary shadow-sm' 
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/20 hover:bg-slate-50 dark:hover:bg-slate-800'
                        )}
                    >
                        <div className={cn("p-2 rounded-full", isNavItemActive(item.href) ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-800")}>
                             <item.icon className={cn("h-6 w-6", isNavItemActive(item.href) ? "text-primary" : "text-slate-500")} />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                ))}
             </>
        )
    }

    return (
        <>
            {mainNavItems.map((item) => {
                if (item.isAction && item.href === '#search') {
                     return (
                        <button
                            key={item.label}
                            onClick={() => setIsOpen(true)}
                            className="flex flex-col items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 h-full w-full hover:text-primary active:scale-95 transition-all"
                        >
                             <div className="p-1 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                                <item.icon className="h-6 w-6" />
                             </div>
                            <span>{item.label}</span>
                        </button>
                     )
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex flex-col items-center justify-center gap-1.5 text-[10px] font-medium h-full w-full transition-all active:scale-95',
                            isNavItemActive(item.href)
                            ? 'text-primary'
                            : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                        )}
                    >
                        <div className={cn("p-1 rounded-xl transition-all", isNavItemActive(item.href) ? "bg-primary/10" : "hover:bg-slate-100 dark:hover:bg-slate-800")}>
                            <item.icon className={cn("h-6 w-6", isNavItemActive(item.href) && "fill-primary/20")} />
                        </div>
                        <span>{item.label}</span>
                    </Link>
                )
            })}
        </>
    );
}
