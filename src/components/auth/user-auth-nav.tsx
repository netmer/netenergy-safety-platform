
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, User as UserIcon, Shield, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { AppUser } from '@/lib/course-data';
import { cn } from '@/lib/utils';

const ERP_ROLES: AppUser['role'][] = ['admin', 'course_specialist', 'training_team', 'inspection_team', 'accounting_team'];

interface UserAuthNavProps {
  scrolled?: boolean;
  isHomePage?: boolean;
}

export function UserAuthNav({ scrolled = false, isHomePage = false }: UserAuthNavProps) {
  const { user, profile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      if (error.code === 'auth/unauthorized-domain') {
        alert('เกิดข้อผิดพลาด: โดเมนนี้ไม่ได้รับอนุญาตให้ทำการยืนยันตัวตน กรุณาตรวจสอบการตั้งค่า Authorized domains ใน Firebase Console ของคุณ');
      } else {
        alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };
  
  const canAccessAdmin = profile?.role === 'admin';
  const canAccessErp = profile?.role && ERP_ROLES.includes(profile.role);

  if (!mounted || loading) {
    return <div className="animate-pulse bg-muted h-9 w-9 rounded-full" />;
  }

  if (!user) {
    return (
      <Button 
        onClick={handleSignIn} 
        variant="outline" 
        size="sm"
        className={cn(
          "rounded-full font-bold h-9 px-4 text-xs transition-all duration-500",
          scrolled 
            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
            : isHomePage 
                ? "bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm" 
                : "bg-primary text-white border-primary shadow-sm"
        )}
      >
        <LogIn className="mr-1.5 h-3.5 w-3.5" />
        เข้าสู่ระบบ
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn(
            "relative h-9 w-9 rounded-full ring-2 transition-transform active:scale-95",
            scrolled ? "ring-primary/10" : isHomePage ? "ring-white/20" : "ring-primary/10"
        )}>
          <Avatar className="h-9 w-9 shadow-sm">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
            <AvatarFallback className="bg-primary/5 text-primary">
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-2xl shadow-2xl p-2 z-[160]" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer">
            <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4 text-slate-400" />
                <span>โปรไฟล์ของฉัน</span>
            </Link>
        </DropdownMenuItem>
        {canAccessAdmin && (
           <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer">
                <Link href="/admin">
                    <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-semibold">ระบบผู้ดูแลเว็บ</span>
                </Link>
           </DropdownMenuItem>
        )}
        {canAccessErp && (
           <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer">
                <Link href="/erp">
                    <Shield className="mr-2 h-4 w-4 text-blue-600" />
                    <span className="font-semibold">ระบบ ERP หลังบ้าน</span>
                </Link>
           </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="rounded-xl py-2.5 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>ออกจากระบบ</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
