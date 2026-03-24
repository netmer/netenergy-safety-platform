'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AdminLogin } from '@/components/auth/admin-login';
import {
  LayoutDashboard,
  BookOpen,
  Building,
  Newspaper,
  Loader2,
  ShieldAlert,
  FileText,
  Shield,
  Globe,
  Menu,
  Users,
  UserCircle,
  Award,
  BarChart3,
  Settings,
  ChevronRight,
  FileSignature,
  Network,
  TestTube2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  SidebarGroup
} from '@/components/ui/sidebar';

const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', Icon: BarChart3 },
    ]
  },
  {
    label: "Management",
    items: [
      { href: '/admin/courses', label: 'จัดการหลักสูตร', Icon: BookOpen },
      { href: '/admin/users', label: 'จัดการผู้ใช้', Icon: Users },
      { href: '/admin/instructors', label: 'จัดการวิทยากร', Icon: UserCircle },
    ]
  },
  {
    label: "Tools & Website",
    items: [
      { href: '/admin/forms', label: 'จัดการแบบฟอร์ม', Icon: FileText },
      { href: '/admin/templates', label: 'จัดการแม่แบบใบเซอร์', Icon: FileSignature },
      { href: '/admin/certifications', label: 'ใบรับรองศูนย์', Icon: Award },
      { href: '/admin/clients', label: 'จัดการลูกค้าองค์กร', Icon: Building },
      { href: '/admin/content', label: 'จัดการเนื้อหาเว็บ', Icon: Newspaper },
    ]
  }
];

export default function AdminLayout({ children }: React.PropsWithChildren) {
  const { user, profile, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  if (loading) return <div className="flex h-svh w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <AdminLogin />;
  if (profile?.role !== 'admin') return <div className="flex min-h-svh items-center justify-center p-4"><Card className="w-full max-w-md text-center p-10 rounded-[2rem] border-none shadow-2xl"><ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-6"/><h2 className="text-2xl font-bold font-headline mb-4">Access Denied</h2><p className="text-muted-foreground font-light mb-8">หน้านี้สำหรับผู้ดูแลระบบเท่านั้นครับ</p><Button asChild className="rounded-xl h-12 px-8 font-bold"><Link href="/">กลับหน้าหลัก</Link></Button></Card></div>;
  
  return (
    <SidebarProvider isCollapsed={isCollapsed}>
      <div className="relative flex min-h-screen w-full bg-slate-50 dark:bg-slate-950/20">
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-3 font-bold px-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30"><Settings className="w-5 h-5" /></div>
                    {!isCollapsed && <span className="text-lg font-headline">Admin<span className="text-primary">Panel</span></span>}
                </div>
            </SidebarHeader>
            <SidebarContent>
                {adminNavGroups.map((group) => (
                    <SidebarGroup key={group.label} label={group.label}>
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuButton Icon={item.Icon} isActive={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))}>
                                            {item.label}
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
                <SidebarGroup label="Other Systems">
                    <SidebarMenu>
                        <SidebarMenuItem><Link href="/erp"><SidebarMenuButton Icon={Shield} className="bg-primary/5 text-primary">ERP Dashboard</SidebarMenuButton></Link></SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <div className="flex items-center justify-between">
                    {!isCollapsed && <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground hover:text-primary"><Link href="/">Back to Site</Link></Button>}
                    <SidebarToggle onClick={() => setIsCollapsed(!isCollapsed)} />
                </div>
            </SidebarFooter>
        </Sidebar>

        <div className={cn("flex flex-col flex-1 transition-all duration-300", "md:ml-64", isCollapsed && "md:ml-[70px]")}>
          <header className="sticky top-0 z-30 flex h-[4.5rem] items-center gap-4 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl px-4 md:px-8 border-b border-white/20 dark:border-white/5 shadow-sm transition-all">
            <div className="flex items-center gap-2 md:hidden">
                <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0"><div className="p-6 font-bold text-xl border-b font-headline">AdminPanel</div></SheetContent></Sheet>
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