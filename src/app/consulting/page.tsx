import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileBadge, HardHat, ShieldCheck, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'งานที่ปรึกษาและตรวจสอบความปลอดภัย | วางระบบมาตรฐาน ISO 45001 และ Safety Audit',
  description: 'เราคือพาร์ทเนอร์ที่ช่วยเปลี่ยนความซับซ้อนของกฎหมายความปลอดภัยให้เป็นระบบที่จัดการง่ายและยั่งยืน บริการปรึกษา ISO 45001, งานตรวจสอบ Safety Audit ประจำปี และวางแผนความปลอดภัยงานก่อสร้างโดยผู้เชี่ยวชาญ',
};

export default function ConsultingPage() {
    const services = [
        {
            icon: FileBadge,
            title: 'วางระบบมาตรฐาน ISO 45001',
            description: 'เราช่วยคุณวางรากฐานระบบการจัดการอาชีวอนามัยและความปลอดภัยให้ได้มาตรฐานระดับโลก ไม่ใช่แค่เพื่อให้ได้ใบรับรอง แต่เพื่อสร้างความเชื่อมั่นสูงสุดให้กับคู่ค้าและดูแลพนักงานอย่างมืออาชีพ',
        },
        {
            icon: HardHat,
            title: 'ความปลอดภัยหน้างานก่อสร้าง',
            description: 'ทีมผู้เชี่ยวชาญพร้อมลงพื้นที่เพื่อวางแผนและตรวจสอบความปลอดภัยในโครงการก่อสร้างทุกขนาด เพื่อลดความเสี่ยงในการหยุดชะงักของงานและควบคุมต้นทุนที่เกิดจากอุบัติเหตุได้อย่างเห็นผล',
        },
        {
            icon: ShieldCheck,
            title: 'งานตรวจสอบ (Safety Audit)',
            description: 'บริการตรวจประเมินความปลอดภัยในสถานประกอบการแบบเจาะลึก เพื่อค้นหาจุดบกพร่องที่อาจถูกมองข้าม พร้อมเสนอแนวทางแก้ไขที่สอดคล้องกับกฎหมายและงบประมาณของคุณอย่างจริงใจ',
        }
    ];

    return (
        <div className="py-12 md:py-20">
            <section className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-bold font-headline leading-tight">
                    บริการที่ปรึกษาและงานตรวจสอบ<br/><span className="text-primary">จากประสบการณ์จริงเพื่อความยั่งยืน</span>
                </h1>
                <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground font-light leading-relaxed">
                    เพราะระบบความปลอดภัยที่ดีคือรากฐานสำคัญของการเติบโตทางธุรกิจ ทีมงาน NET Safety พร้อมเป็นเพื่อนคู่คิดในการพัฒนาระบบความปลอดภัยขององค์กรคุณให้เหนือกว่าที่กฎหมายกำหนดครับ
                </p>
            </section>

            <section className="my-16">
                 <div className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video max-h-[500px] mx-auto relative group">
                    <Image
                        src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200&h=600"
                        alt="ทีมวิศวกรความปลอดภัยของ NET กำลังทำการตรวจสอบระบบในโรงงานอย่างละเอียด"
                        width={1200}
                        height={600}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                        data-ai-hint="safety professional inspection"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                </div>
            </section>
            
            <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service, index) => (
                    <Card key={index} className="flex flex-col border-none shadow-lg hover:shadow-xl transition-all rounded-[2rem] bg-card/50 backdrop-blur-sm">
                        <CardHeader className="items-center text-center pt-10">
                            <div className="p-5 bg-primary/10 rounded-2xl w-fit mb-4">
                                <service.icon className="w-10 h-10 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-headline">{service.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-muted-foreground flex-grow px-8 pb-10">
                           <p className="font-light leading-relaxed">{service.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="mt-24 text-center">
                 <Card className="max-w-3xl mx-auto bg-slate-900 text-white rounded-[2.5rem] overflow-hidden relative border-none shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="relative z-10 pt-12">
                        <CardTitle className="text-3xl font-headline">ให้เราช่วยคุณวางระบบที่สมบูรณ์แบบ</CardTitle>
                        <CardDescription className="text-slate-400 text-lg mt-2 font-light">
                           เราพร้อมให้คำปรึกษาเบื้องต้นโดยไม่มีค่าใช้จ่าย เพื่อร่วมกันหาแนวทางที่ดีที่สุดสำหรับองค์กรคุณครับ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pb-12">
                        <Button size="lg" className="rounded-full h-14 px-10 text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105" asChild>
                            <Link href="/contact">
                                นัดคุยกับที่ปรึกษาของเรา <ArrowRight className="ml-2 h-5 w-5"/>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}