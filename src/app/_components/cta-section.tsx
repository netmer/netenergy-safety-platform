'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sparkles, MessageCircle } from 'lucide-react';

export function AnimatedCTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-slate-900">
      {/* Background Gradient - Use CSS gradients instead of complex animated SVG filters where possible */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/20 z-0" />
      
      {/* Simplified Background Elements - Fewer animations for better performance */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-full mb-8 backdrop-blur-sm border border-primary/30"
            >
                <Sparkles className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight"
            >
                ต้องการจัดอบรม<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    ให้ทีมของคุณ?
                </span>
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto"
            >
                ลองใช้ระบบแนะนำหลักสูตรอัตโนมัติ บอกข้อมูลองค์กรและลักษณะงาน แล้วรับรายการหลักสูตรที่ตรงกับกฎหมายของคุณ หรือติดต่อทีมงานโดยตรงเพื่อรับใบเสนอราคา
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
            >
                <Button asChild size="lg" className="text-lg h-16 px-8 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                    <Link href="/compliance-checker">
                        <Sparkles className="mr-2 h-5 w-5 text-primary" /> 
                        ให้ AI แนะนำหลักสูตร
                    </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg h-16 px-8 rounded-2xl bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                    <Link href="/contact">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        ปรึกษาผู้เชี่ยวชาญ
                    </Link>
                </Button>
            </motion.div>
        </div>
      </div>
    </section>
  );
}
