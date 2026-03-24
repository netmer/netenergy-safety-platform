
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { findCertificateById } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto" size="lg">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังค้นหา...
        </>
      ) : (
        <>
          <Search className="mr-2 h-4 w-4" />
          ค้นหา
        </>
      )}
    </Button>
  );
}

const initialState = { success: false, message: '', recordId: '' };

export function CertificateSearchForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [state, formAction] = useActionState(findCertificateById, initialState);

    useEffect(() => {
        if (state.message && !state.success) {
             toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: state.message,
            });
        }
        if (state.success && state.recordId) {
            router.push(`/erp/certificate/${state.recordId}`);
        }
    }, [state, toast, router]);

    return (
        <div className="text-center p-6 md:p-10 rounded-lg bg-card border">
            <div className="mx-auto w-fit p-4 bg-primary/10 rounded-full mb-4">
                <Award className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">ค้นหาใบประกาศนียบัตร</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                ค้นหาด้วยเลขที่ใบรับรอง หรือ เลขบัตรประชาชน/Passport ของผู้เข้าอบรม
            </p>
            <form action={formAction} className="mt-6 max-w-lg mx-auto">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Label htmlFor="searchId" className="sr-only">เลขที่ใบรับรอง หรือ เลขบัตรประชาชน</Label>
                    <Input 
                        id="searchId" 
                        name="searchId" 
                        required 
                        className="h-12 text-base flex-1"
                        placeholder="กรอกเลขที่เพื่อค้นหา..."
                    />
                    <SubmitButton />
                </div>
            </form>
        </div>
    )
}
