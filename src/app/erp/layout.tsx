'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AdminLogin } from '@/components/auth/admin-login';
import {
  LayoutDashboard,
  Calendar,
  Loader2,
  ShieldAlert,
  ClipboardList,
  Users,
  Globe,
  Menu,
  History,
  Award,
  CreditCard,
  Shield,
  LayoutGrid,
  Settings,
  ChevronRight,
  X,
  ChevronsRight,
  Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AppUser } from '@/lib/course-data';
import { cn } from '@/lib/utils';
import { UserAuthNav } from '@/components/auth/user-auth-nav';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/erp/notification-bell';
import { DynamicBreadcrumb } from '@/components/layout/dynamic-breadcrumb';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarToggle,
  SidebarHeader,
  SidebarGroup,
  useSidebar
} from '@/components/ui/sidebar';

const ERP_ROLES: AppUser['role'][] = ['admin', 'call_center', 'training_team', 'inspection_team', 'accounting_team'];

const erpNavGroups = [
  {
    label: "Main",
    items: [
      { href: '/erp', label: 'Dashboard', Icon: LayoutDashboard, roles: ERP_ROLES },
    ]
  },
  {
    label: "Operations",
    items: [
      { href: '/erp/schedule', label: 'จัดการตารางอบรม', Icon: Calendar, roles: ['admin', 'call_center'] },
      { href: '/erp/registrations', label: 'ข้อมูลการลงทะเบียน', Icon: ClipboardList, roles: ['admin', 'call_center', 'training_team', 'inspection_team'] },
      { href: '/erp/attendees', label: 'จัดการข้อมูลผู้อบรม', Icon: Users, roles: ['admin', 'training_team', 'inspection_team'] },
    ]
  },
  {
    label: "Records & Billing",
    items: [
      { href: '/erp/billing', label: 'การเงิน/บัญชี', Icon: CreditCard, roles: ['admin', 'accounting_team'] },
      { href: '/erp/delivery', label: 'การจัดส่ง', Icon: Package, roles: ['admin', 'call_center', 'training_team'] },
      { href: '/erp/history', label: 'ประวัติการอบรม', Icon: History, roles: ['admin', 'training_team', 'inspection_team'] },
      { href: '/erp/certificate', label: 'พิมพ์ใบประกาศ', Icon: Award, roles: ['admin', 'training_team'] },
    ]
  }
];

function ErpNav({ userRole }: { userRole: AppUser['role']}) {
    const pathname = usePathname();
    const isNavItemActive = (href: string) => href === '/erp' ? pathname === '/erp' : pathname.startsWith(href);

    return (
        <div className="space-y-4">
            {erpNavGroups.map((group) => {
                const visibleItems = group.items.filter(item => item.roles.includes(userRole));
                if (visibleItems.length === 0) return null;
                return (
                    <SidebarGroup key={group.label} label={group.label}>
                        <SidebarMenu>
                            {visibleItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuButton Icon={item.Icon} isActive={isNavItemActive(item.href)}>
                                            {item.label}
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                );
            })}
            {userRole === 'admin' && (
                <SidebarGroup label="Systems">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/admin">
                                <SidebarMenuButton Icon={Settings} className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100">
                                    Admin Panel
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            )}
        </div>
    )
}

export default function ErpLayout({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (loading) return <div className="flex h-svh w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <AdminLogin />;
  
  const userRole = profile?.role;
  if (!userRole || !ERP_ROLES.includes(userRole)) return <div className="flex min-h-svh items-center justify-center p-4"><Card className="w-full max-w-md text-center p-10 rounded-[2.5rem] border-none shadow-2xl"><ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-6"/><h2 className="text-2xl font-bold font-headline mb-4">Internal Only</h2><p className="text-muted-foreground font-light mb-8">ส่วนนี้สงวนไว้สำหรับเจ้าหน้าที่เท่านั้นครับ</p><Button asChild className="rounded-xl h-12 px-8 font-bold"><Link href="/">กลับหน้าหลัก</Link></Button></Card></div>;
  
  const isPlainPage = pathname.startsWith('/erp/registrations/edit/') || pathname.startsWith('/erp/certificate/');
  if (isPlainPage) return <main className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950/20 min-h-screen">{children}</main>;

  return (
    <SidebarProvider isCollapsed={isCollapsed}>
      <div className="relative flex min-h-screen w-full bg-slate-50 dark:bg-slate-950/20">
        <Sidebar>
            <SidebarHeader>
                <Link href="/erp" className="flex items-center gap-3 font-bold">
                    <div className="relative w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                        <Shield className="w-5 h-5" />
                    </div>
                    {!isCollapsed && <span className="text-lg tracking-tight font-headline">NET<span className="text-blue-600">ERP</span></span>}
                </Link>
            </SidebarHeader>
            <SidebarContent><ErpNav userRole={userRole} /></SidebarContent>
            <SidebarFooter>
                <div className="flex items-center justify-between">
                    {!isCollapsed && <Button asChild variant="ghost" size="sm" className="text-xs font-bold gap-2 text-muted-foreground hover:text-blue-600"><Link href="/"><Globe className="w-3.5 h-3.5" /> Back to Site</Link></Button>}
                    <SidebarToggle onClick={() => setIsCollapsed(!isCollapsed)} />
                </div>
            </SidebarFooter>
        </Sidebar>

        <div className={cn("flex flex-col flex-1 min-w-0 transition-all duration-300", "md:ml-64", isCollapsed && "md:ml-[70px]")}>
          <header className="sticky top-0 z-30 flex h-[4.5rem] items-center gap-4 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl px-4 md:px-8 border-b border-white/20 dark:border-white/5 shadow-sm transition-all">
            <div className="flex items-center gap-2 md:hidden">
                <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0"><ErpNav userRole={userRole} /></SheetContent></Sheet>
            </div>
            
            <DynamicBreadcrumb />
            
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-800">
                    <NotificationBell />
                    <ThemeToggle />
                </div>
                <div className="h-8 w-px bg-border/50 mx-1" />
                <UserAuthNav />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 lg:p-10"><div className="max-w-[1600px] mx-auto">{children}</div></main>
        </div>
      </div>
    </SidebarProvider>
  );
}