'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Lock } from 'lucide-react';

export function AdminLogin() {
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

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
           <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
          <CardDescription>กรุณาเข้าสู่ระบบเพื่อเข้าสู่ส่วนของผู้ดูแล</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleSignIn}>
            เข้าสู่ระบบด้วย Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
