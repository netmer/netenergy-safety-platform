'use client';

import { motion } from 'framer-motion';
import { Users, BookOpen, Award, Building2 } from 'lucide-react';

const stats = [
  {
    icon: <Users className="w-8 h-8" />,
    value: '100,000+',
    label: 'ผู้ผ่านการอบรม',
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    value: '50+',
    label: 'หลักสูตรมาตรฐาน',
  },
  {
    icon: <Award className="w-8 h-8" />,
    value: '15+',
    label: 'ปีแห่งความเชี่ยวชาญ',
  },
  {
    icon: <Building2 className="w-8 h-8" />,
    value: '500+',
    label: 'องค์กรทั่วประเทศ',
  },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-primary text-primary-foreground overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                {stat.icon}
              </div>
              <motion.span
                className="text-4xl md:text-5xl font-bold mb-2 tracking-tight"
                initial={{ scale: 0.5 }}
                whileInView={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, delay: index * 0.1 + 0.2 }}
              >
                {stat.value}
              </motion.span>
              <span className="text-sm md:text-base font-medium opacity-90 uppercase tracking-wider">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
