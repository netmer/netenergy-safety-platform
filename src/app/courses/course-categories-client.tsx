'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles, LayoutGrid, GraduationCap } from 'lucide-react';
import type { CourseCategory } from '@/lib/course-data';
import { cn } from '@/lib/utils';

const CategoryCard = ({ category, delay = 0, index = 0 }: { category: CourseCategory, delay?: number, index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative block overflow-hidden rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all duration-500 h-[420px] bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50"
    >
        <Link href={`/courses/${category.id}`} className="block h-full w-full relative">
            <Image
                src={category.image || `https://picsum.photos/seed/cat-${index}/800/800`}
                alt={category.title}
                fill
                priority={index < 2}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 will-change-transform"
                data-ai-hint={category.hint || "safety category"}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500"></div>
            
            {/* Content */}
            <div className="relative flex h-full flex-col justify-end p-8 text-white z-10">
                <div className="mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
                        <LayoutGrid className="w-3 h-3" /> Training Path
                    </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold font-headline mb-3 leading-tight group-hover:text-primary transition-colors">
                    {category.title}
                </h3>
                
                <p className="text-sm text-slate-300 line-clamp-2 mb-6 font-light leading-relaxed">
                    {category.description || "สำรวจหลักสูตรอบรมมาตรฐานสากลที่ออกแบบมาเพื่อความปลอดภัยสูงสุดของบุคลากรในองค์กรคุณ"}
                </p>

                <div className="flex items-center text-xs font-bold text-white uppercase tracking-widest">
                    <span className="relative">
                        ดูหลักสูตร
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </span>
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-2 transition-transform duration-300 text-primary" />
                </div>
            </div>
        </Link>
    </motion.div>
  );
};

interface CourseCategoriesClientProps {
    categories: CourseCategory[];
}

export default function CourseCategoriesClient({ categories }: CourseCategoriesClientProps) {
    if (!categories || categories.length === 0) {
        return (
            <div className="py-32 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-muted-foreground">กำลังจัดเตรียมข้อมูลหลักสูตร...</h2>
            </div>
        );
    }

    return (
        <div className="py-12 md:py-20">
            <div className="text-center mb-16 max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold mb-8 border border-primary/20 uppercase tracking-widest"
                >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    มาตรฐานการฝึกอบรมระดับสากล
                </motion.div>
                <h1 className="text-3xl md:text-5xl font-bold font-headline tracking-tight mb-6">
                    หมวดหมู่หลักสูตร<span className="text-primary">ยอดนิยม</span>
                </h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-2xl mx-auto"
                >
                    ยกระดับทักษะและมาตรฐานความปลอดภัย <br className="hidden md:block" /> ด้วยหลักสูตรที่ได้รับรองตามกฎหมายและมาตรฐานสากล
                </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* AI Recommender Card - Same size as others */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="h-[420px]"
                >
                    <Link href="/compliance-checker" className="group relative h-full flex flex-col justify-center p-8 rounded-[2.5rem] bg-slate-950 text-white shadow-2xl hover:shadow-primary/30 transition-all duration-700 overflow-hidden border border-white/10">
                         {/* Animated background elements */}
                        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
                            <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-primary/20 rounded-full blur-[100px] will-change-transform"></div>
                            <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-primary/40 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 will-change-transform"></div>
                            <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[80px]"></div>
                        </div>
                        
                        <div className="relative z-10">
                            <motion.div
                                className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-6 backdrop-blur-xl"
                                animate={{ scale: [1, 1.08, 1] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Sparkles className="h-8 w-8 text-primary" />
                            </motion.div>
                            <h2 className="text-2xl md:text-4xl font-semibold mb-4 tracking-tight leading-[1.1] font-headline">
                                ค้นหาหลักสูตร<br/>ด้วยระบบ <span className="text-primary italic">AI Advisor</span>
                            </h2>
                            <p className="text-slate-400 mb-8 text-sm font-light leading-relaxed">
                                ไม่แน่ใจว่าต้องอบรมหลักสูตรไหน? ให้ AI วิเคราะห์ความต้องการตามกฎหมายและหน้างานของคุณในไม่กี่วินาที
                            </p>
                            <div className="inline-flex items-center font-bold text-xs uppercase tracking-widest rounded-xl bg-primary hover:bg-primary/90 text-white px-6 py-4 shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95">
                                เริ่มการวิเคราะห์ <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </div>
                    </Link>
                </motion.div>
                
                {/* Category cards */}
                {categories.map((category, index) => (
                    <CategoryCard
                        key={category.id}
                        category={category}
                        delay={index * 0.04}
                        index={index}
                    />
                ))}
                
            </div>
        </div>
    );
}

import { Loader2 } from 'lucide-react';