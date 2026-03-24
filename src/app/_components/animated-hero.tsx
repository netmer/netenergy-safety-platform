'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, PlayCircle, ShieldCheck } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

export function AnimatedHero() {
  const ref = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const y = useTransform(smoothProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(smoothProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [1, 1.05]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section ref={ref} className="relative h-[70vh] sm:h-[80vh] md:h-[90vh] min-h-[500px] md:min-h-[700px] flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background with optimized transforms */}
      {isMounted && (
        <motion.div 
          style={{ y, opacity, scale }}
          className="absolute inset-0 z-0 will-change-transform"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/30 to-background z-10" />
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),transparent_70%)] z-10" />
           <Image
            src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/hero.png?alt=media&token=1f2fd308-ddc4-49db-a9ad-2a479244779c"
            alt="Modern Safety Control Room"
            fill
            priority
            className="object-cover transform-gpu"
            data-ai-hint="modern safety control room"
          />
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-20 container px-4 mx-auto h-full flex flex-col justify-center pt-10 sm:pt-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto text-center"
        >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white/90 text-xs sm:text-sm font-semibold mb-6 sm:mb-8 mx-auto hover:bg-white/20 transition-colors cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                ผู้นำด้านการฝึกอบรมความปลอดภัยอันดับ 1
            </motion.div>

            <motion.div variants={itemVariants} className="relative mb-4 sm:mb-6">
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-none transform-gpu">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-blue-400 animate-shimmer bg-[length:200%_100%]">
                    NET
                    </span>
                </h1>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-none mt-2 transform-gpu"> 
                 Training
                </h2>
            </motion.div>

            <motion.p
                variants={itemVariants}
                className="mt-4 sm:mt-8 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-light px-4"
            >
                เราคือพาร์ทเนอร์ที่พร้อมขับเคลื่อน 
                <span className="text-white font-medium"> วัฒนธรรมความปลอดภัย</span> 
                <span className="hidden sm:inline text-slate-400"> ด้วยนวัตกรรม AI และประสบการณ์ระดับมืออาชีพ</span>
            </motion.p>

            <motion.div
                variants={itemVariants}
                className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
                <Button asChild size="lg" className="h-12 sm:h-14 w-full sm:w-auto px-10 text-base rounded-xl bg-primary text-white hover:bg-primary/90 transition-all hover:scale-105 shadow-xl border-none font-semibold">
                    <Link href="/courses">
                        สำรวจหลักสูตร <ChevronRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
                
                <Button asChild size="lg" variant="ghost" className="h-12 sm:h-14 w-full sm:w-auto px-10 text-base rounded-xl text-white border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all font-medium">
                    <Link href="/about" className="flex items-center gap-2 justify-center">
                        <PlayCircle className="h-5 w-5" />
                        รู้จักเรา
                    </Link>
                </Button>
            </motion.div>

             {/* Stats Preview */}
             <motion.div 
                variants={itemVariants}
                className="mt-12 sm:mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-slate-400 text-xs sm:text-sm font-medium max-w-4xl mx-auto border-t border-white/10 pt-8 sm:pt-12"
             >
                {[
                    { label: 'ผู้ผ่านการอบรม', val: '100k+' },
                    { label: 'องค์กรชั้นนำ', val: '500+' },
                    { label: 'ความพึงพอใจ', val: '98%' },
                    { label: 'พร้อมให้บริการ', val: '24/7' },
                ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <span className="text-white text-xl sm:text-2xl font-bold mb-1 sm:mb-2">{stat.val}</span>
                        <span className="uppercase tracking-[0.15em] text-[9px] sm:text-[10px] text-slate-500 font-bold">{stat.label}</span>
                    </div>
                ))}
             </motion.div>
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 hidden md:block"
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center p-1.5">
             <motion.div 
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
             />
        </div>
      </motion.div>
    </section>
  );
}
