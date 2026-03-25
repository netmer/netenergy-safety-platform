
'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

interface HeaderNavItemsProps {
    scrolled?: boolean;
    isHomePage?: boolean;
}

export function HeaderNavItems({ scrolled = false, isHomePage = false }: HeaderNavItemsProps) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isNavItemActive = (href: string) => {
        if (href === '/') return pathname === href;
        return pathname.startsWith(href);
    };

    // Determine text color based on scrolled status and page type
    const getLinkColor = () => {
        if (!mounted) {
            return isHomePage ? "text-white" : "text-slate-900 dark:text-slate-100";
        }
        if (scrolled) {
            return "text-slate-900 dark:text-slate-100 hover:text-primary dark:hover:text-primary";
        }
        if (isHomePage) {
            return "text-white hover:text-white/80";
        }
        return "text-slate-900 dark:text-slate-100 hover:text-primary";
    };

    const linkClass = cn(
        "bg-transparent hover:bg-transparent focus:bg-transparent data-[active]:bg-transparent data-[state=open]:bg-transparent transition-colors duration-500 font-medium",
        getLinkColor()
    );

    const navItems = [
        { href: '/', label: 'หน้าแรก' },
        { href: '/courses', label: 'หลักสูตร' },
        { href: '/consulting', label: 'บริการที่ปรึกษา' },
        { href: '/blog', label: 'บทความ' },
        { href: '/training-history', label: 'ประวัติการอบรม' },
        { href: '/contact', label: 'ติดต่อเรา' },
    ];

    return (
        <NavigationMenu>
            <NavigationMenuList className="gap-1 md:gap-2">
                {navItems.map((item) => (
                    <NavigationMenuItem key={item.href}>
                        <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), linkClass, isNavItemActive(item.href) && "text-primary font-semibold")}>
                            <Link href={item.href}>
                                {item.label}
                            </Link>
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
        </NavigationMenu>
    );
}
