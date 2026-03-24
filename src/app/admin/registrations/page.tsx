import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';

export default function AdminRegistrationsMovedPage() {
    return (
        <Card className="w-full max-w-lg mx-auto mt-8">
            <CardHeader className="items-center text-center">
                 <div className="p-4 bg-primary/10 rounded-full w-fit mb-4">
                    <ClipboardList className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>หน้านี้ถูกย้ายแล้ว</CardTitle>
                <CardDescription>
                    การจัดการข้อมูลการลงทะเบียนได้ถูกย้ายไปที่ระบบ ERP ใหม่
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <Button asChild>
                    <Link href="/erp/registrations">
                        ไปที่หน้าข้อมูลการลงทะเบียน <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
