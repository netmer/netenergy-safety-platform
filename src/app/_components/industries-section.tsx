'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Factory,
  HardHat,
  Truck,
  Zap,
  Building2,
  FlaskConical,
  HeartPulse,
  Wrench,
  ArrowRight,
} from 'lucide-react';

const industries = [
  {
    icon: Factory,
    title: 'โรงงานอุตสาหกรรม',
    description: 'หลักสูตร จป. ครบตามกฎหมายแรงงาน',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: HardHat,
    title: 'ก่อสร้าง',
    description: 'ความปลอดภัยบนพื้นที่ก่อสร้างและงานสูง',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Truck,
    title: 'โลจิสติกส์และขนส่ง',
    description: 'ความปลอดภัยในคลังสินค้าและการขนส่ง',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Zap,
    title: 'พลังงานและไฟฟ้า',
    description: 'งานไฟฟ้า ปั๊มน้ำมัน และพลังงานทดแทน',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Building2,
    title: 'สำนักงาน',
    description: 'อพยพหนีไฟและปฐมพยาบาลสำหรับออฟฟิศ',
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
  },
  {
    icon: FlaskConical,
    title: 'ปิโตรเคมีและเคมีภัณฑ์',
    description: 'การจัดการสารเคมีอันตรายและ HAZMAT',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: HeartPulse,
    title: 'สาธารณสุข',
    description: 'ปฐมพยาบาลและการช่วยชีวิตขั้นพื้นฐาน',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: Wrench,
    title: 'อุตสาหกรรมบริการ',
    description: 'งานบำรุงรักษาและซ่อมบำรุงอุปกรณ์',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

export function IndustriesSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950/50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-5 border border-primary/20 uppercase tracking-widest"
          >
            อุตสาหกรรมที่เราดูแล
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl md:text-4xl font-bold font-headline mb-4 tracking-tight"
          >
            ให้บริการทุกภาคอุตสาหกรรม
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-xl mx-auto text-base"
          >
            หลักสูตรของเราออกแบบให้ตรงกับลักษณะงานและกฎหมายที่ใช้จริงในแต่ละอุตสาหกรรม
          </motion.p>
        </div>

        {/* Industries Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
          {industries.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col items-center text-center p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 will-change-transform"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1 leading-tight">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center mt-12"
        >
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors group"
          >
            ดูหลักสูตรทั้งหมด
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
