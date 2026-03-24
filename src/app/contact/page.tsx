import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ติดต่อเรา | NetEnergy Safety Platform',
  description: 'ติดต่อสอบถามข้อมูล, ขอใบเสนอราคา, หรือปรึกษาปัญหาด้านความปลอดภัยกับทีมงานผู้เชี่ยวชาญของเรา',
};


export default function ContactPage() {
  
  // This is a server component, so form submission needs to be handled via a server action or client component.
  // For simplicity, we are displaying the information. A real form would require a client component and action.
  const handleSubmit = async (formData: FormData) => {
      'use server';
      // In a real app, you would handle form submission here (e.g., send an email).
      console.log('Form submitted:', Object.fromEntries(formData.entries()));
      // Then you would redirect or show a success message.
  }

  return (
    <div className="py-12 md:py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">
          ติดต่อเรา
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          เราพร้อมให้คำปรึกษาและตอบทุกคำถามของคุณ โปรดเลือกช่องทางการติดต่อที่สะดวกที่สุด
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
            <h2 className="text-2xl font-semibold">ข้อมูลการติดต่อ</h2>
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <MapPin className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">ที่อยู่</h3>
                        <p className="text-muted-foreground">123 ถนนสุขุมวิท, แขวงคลองเตยเหนือ, เขตวัฒนา, กรุงเทพมหานคร 10110</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Phone className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">โทรศัพท์</h3>
                        <p className="text-muted-foreground">02-123-4567, 081-234-5678</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Mail className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">อีเมล</h3>
                        <p className="text-muted-foreground">contact@netenergy.tech</p>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <Card>
                <CardHeader>
                    <CardTitle>ส่งข้อความถึงเรา</CardTitle>
                    <CardDescription>กรอกแบบฟอร์มด้านล่าง ทีมงานจะติดต่อกลับโดยเร็วที่สุด</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                            <Input id="name" name="name" required placeholder="ชื่อของคุณ"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input id="email" name="email" type="email" required placeholder="email@example.com"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="subject">หัวข้อ</Label>
                            <Input id="subject" name="subject" required placeholder="เรื่องที่ต้องการติดต่อ"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">ข้อความ</Label>
                            <Textarea id="message" name="message" required rows={5} placeholder="พิมพ์ข้อความของคุณที่นี่..."/>
                        </div>
                        <Button type="submit" className="w-full">ส่งข้อความ</Button>
                    </form>
                </CardContent>
            </Card>
        </div>

      </div>

    </div>
  );
}
