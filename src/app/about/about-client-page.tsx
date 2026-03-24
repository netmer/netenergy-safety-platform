'use client';

import Image from 'next/image';
import { Building, Target, Users, CheckCircle2, Award, Heart, Globe2, Lightbulb, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
    const targetRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section with Parallax */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center bg-slate-950 overflow-hidden">
         <motion.div 
            style={{ y }}
            className="absolute inset-0 z-0 opacity-40"
         >
             <Image
                src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/hero.png?alt=media&token=1f2fd308-ddc4-49db-a9ad-2a479244779c"
                alt="สำนักงานใหญ่ NET Safety"
                fill
                className="object-cover"
                priority
             />
         </motion.div>
         <div className="absolute inset-0 bg-gradient-to-t from-background via-slate-950/80 to-slate-950/40 z-10" />
         
         <div className="container relative z-20 px-4 text-center">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                 <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 backdrop-blur-md text-sm font-medium mb-6">
                    <Award className="w-4 h-4 mr-2" />
                    พาร์ทเนอร์ที่พร้อมร่วมสร้างสังคมที่ปลอดภัยไปกับคุณ
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold font-headline text-white tracking-tight mb-6 leading-tight">
                    มากกว่าแค่การอบรม<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        คือการร่วมสร้าง "วัฒนธรรมความปลอดภัย" ที่ยั่งยืน
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
                    ที่ NET เราเริ่มจากความเชื่อที่ว่า "ทุกคนมีสิทธิ์ที่จะกลับบ้านหาคนที่รักอย่างปลอดภัยในทุกวัน" เราจึงทุ่มเทออกแบบการเรียนรู้ที่นำไปใช้งานได้จริง ไม่ใช่เพียงแค่การทำตามกฎหมาย
                </p>
            </motion.div>
         </div>
      </section>

      {/* Mission & Vision Section */}
      <section ref={targetRef} className="py-20 md:py-32 relative">
        <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative"
                >
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                         <Image
                            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                            alt="ทีมผู้เชี่ยวชาญของ NET Safety กำลังให้คำปรึกษา"
                            width={800}
                            height={600}
                            className="object-cover w-full h-full"
                        />
                    </div>
                     <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-xs border border-slate-100 dark:border-slate-700 hidden md:block">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg">กว่า 15 ปี</p>
                                <p className="text-sm text-muted-foreground">แห่งความเชี่ยวชาญในงานจริง</p>
                            </div>
                        </div>
                     </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <h2 className="text-2xl md:text-3xl font-semibold font-headline mb-6">
                        เป้าหมายสูงสุดของเราคือ <br/>
                        <span className="text-primary">"ความปลอดภัยที่ไม่ใช่ภาระ แต่คือหัวใจของความสำเร็จ"</span>
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed mb-8 font-light">
                        เราไม่ได้วัดความสำเร็จที่จำนวนผู้เรียน แต่เราวัดผลจาก "จิตสำนึก" และ "อุบัติเหตุที่ลดลงจริง" ในองค์กรของคุณ เราภูมิใจที่เป็นส่วนหนึ่งในการวางรากฐานความปลอดภัยที่แข็งแกร่งให้กับบริษัทชั้นนำทั่วประเทศ
                    </p>
                    
                    <div className="space-y-4">
                        {[
                            "เปลี่ยนกฎหมายที่เข้าใจยาก ให้เป็นแนวทางที่พนักงานนำไปทำตามได้ทันที",
                            "ปลูกฝัง Safety Mindset ให้เข้าถึงใจพนักงานในทุกระดับชั้น",
                            "นำนวัตกรรม AI และเทคโนโลยีใหม่ๆ มาช่วยลดความเสี่ยงอย่างตรงจุด"
                        ].map((item, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                                <p className="font-medium text-slate-700 dark:text-slate-300">{item}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
             <div className="text-center mb-16 max-w-2xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-semibold font-headline mb-4">สิ่งที่เรายึดมั่นเพื่อให้คุณมั่นใจในบริการ</h2>
                <p className="text-muted-foreground font-light text-lg">
                    เพราะงานความปลอดภัยต้องการทั้งความถูกต้องแม่นยำ และความเป็นมืออาชีพที่พร้อมดูแลคุณ
                </p>
             </div>

             <div className="grid gap-8 md:grid-cols-3">
                {[
                    {
                        icon: Globe2,
                        title: "ความรู้ที่ก้าวทันโลกเสมอ",
                        desc: "เราอัปเดตหลักสูตรตามกฎหมายใหม่ล่าสุดปี 2568 และมาตรฐานระดับสากลอย่างต่อเนื่อง เพื่อให้พนักงานของคุณได้รับสิ่งที่ดีที่สุด"
                    },
                    {
                        icon: Lightbulb,
                        title: "เรียนรู้ผ่านการลงมือทำจริง",
                        desc: "เราใช้เทคนิคการสอนแบบ Interactive และ AI เข้ามาช่วย เพื่อให้การอบรมสนุก น่าจดจำ และนำไปใช้งานได้จริงหน้างาน"
                    },
                    {
                        icon: Heart,
                        title: "ดูแลคุณเหมือนเพื่อนคู่คิด",
                        desc: "เราให้คำปรึกษาด้วยความจริงใจ ตั้งแต่การเตรียมเอกสารจนถึงการติดตามผลหลังการอบรมอย่างใกล้ชิด"
                    }
                ].map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group bg-white dark:bg-slate-900 rounded-2xl">
                            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-blue-400" />
                            <CardHeader className="pb-2">
                                <div className="w-14 h-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <item.icon className="w-8 h-8" />
                                </div>
                                <CardTitle className="text-xl font-semibold font-headline">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed font-light">{item.desc}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
             </div>
          </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10" />
          <div className="container mx-auto px-4 relative z-10 text-center">
                <h2 className="text-3xl md:text-4xl font-semibold font-headline mb-6">
                    พร้อมให้เราดูแลความปลอดภัย<br className="md:hidden" /> ขององค์กรคุณแล้วหรือยังครับ?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 font-light">
                    ไม่ต้องกังวลเรื่องกฎหมายที่ซับซ้อน ให้ทีมผู้เชี่ยวชาญของเราช่วยออกแบบโซลูชันที่คุ้มค่าและตอบโจทย์การทำงานจริงของคุณมากที่สุดครับ
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="text-lg h-14 px-8 rounded-full shadow-lg hover:shadow-primary/30 transition-all font-semibold">
                        <Link href="/courses">เลือกดูหลักสูตรที่สนใจ</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="text-lg h-14 px-8 rounded-full bg-background/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 font-medium">
                        <Link href="/contact">ปรึกษาทีมงานฟรีวันนี้</Link>
                    </Button>
                </div>
          </div>
      </section>
    </div>
  );
}