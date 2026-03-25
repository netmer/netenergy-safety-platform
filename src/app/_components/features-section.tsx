'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Zap, Layers, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: <Zap className="h-8 w-8" />,
    title: 'Fast & Efficient',
    description: 'ระบบการเรียนรู้ที่รวดเร็วและมีประสิทธิภาพสูงสุด ประหยัดเวลาแต่ได้ผลลัพธ์เต็มที่',
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: <ShieldCheck className="h-8 w-8" />,
    title: 'Certified Security',
    description: 'มาตรฐานความปลอดภัยระดับสากล มั่นใจได้ในทุกขั้นตอนการฝึกอบรมและข้อมูล',
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: <Layers className="h-8 w-8" />,
    title: 'Comprehensive',
    description: 'ครอบคลุมทุกด้าน ตั้งแต่พื้นฐานจนถึงระดับสูง รองรับทุกความต้องการขององค์กร',
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: 'Data-Driven',
    description: 'วิเคราะห์ผลการเรียนรู้ด้วยข้อมูลจริง ช่วยให้พัฒนาบุคลากรได้อย่างตรงจุด',
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

export function FeaturesSection() {
  return (
     <section className="py-32 bg-background relative overflow-hidden">
        {/* Optimized Static Background Shapes instead of animating filter blur */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
             {/* Text Content */}
             <div className="lg:w-1/3">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                        ทำไมต้องเลือก 
                        <span className="text-primary"> NET</span>
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                        ให้บริการฝึกอบรมด้านความปลอดภัยมาตั้งแต่ปี 2552 หลักสูตรทุกหลักสูตรออกแบบให้สอดคล้องกับกฎหมายแรงงานและมาตรฐานสากล พร้อมทีมวิทยากรที่มีประสบการณ์จากภาคสนามจริง
                    </p>
                    <div className="h-1.5 w-20 bg-primary rounded-full" />
                </motion.div>
             </div>

             {/* Cards Grid */}
             <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className={index % 2 === 1 ? "md:translate-y-8" : ""}
                  >
                    <Card className="h-full border-none shadow-lg bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-300 group overflow-hidden will-change-transform">
                      <CardHeader>
                        <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                           {feature.icon}
                        </div>
                        <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                            {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
             </div>
          </div>
        </div>
      </section>
  );
}
