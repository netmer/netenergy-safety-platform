import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Course } from '@/lib/course-data';
import { QuoteRequestForm } from './quote-request-form';
import type { Metadata } from 'next';
import { FileText, Loader2, ShieldCheck, Zap, MessageSquare, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'ขอใบเสนอราคา In-house & Public Training | NET Safety',
  description: 'ขอใบเสนอราคาสำหรับหลักสูตรอบรมความปลอดภัยสำหรับองค์กร รวดเร็ว แม่นยำ พร้อมรับคำปรึกษาจากผู้เชี่ยวชาญฟรี',
};

export default async function RequestQuotePage() {
  const coursesQuery = query(collection(db, 'courses'), orderBy('title'));
  const coursesSnapshot = await getDocs(coursesQuery);
  const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

  return (
    <div className="py-12 md:py-24 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10 -translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          
          {/* Left Column: Info & Trust */}
          <div className="lg:w-1/3 lg:sticky lg:top-32">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                <FileText className="w-3.5 h-3.5" />
                Quotation Service
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-headline leading-tight mb-6">
              ยกระดับความปลอดภัย<br />
              <span className="text-primary italic">ด้วยโซลูชันที่คุ้มค่า</span>
            </h1>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-10">
              กรอกข้อมูลเพื่อให้ทีมงานประเมินงบประมาณและจัดทำใบเสนอราคาที่เหมาะสมที่สุดสำหรับองค์กรของคุณครับ
            </p>

            <div className="space-y-8">
                {[
                    { 
                        icon: Zap, 
                        title: "รวดเร็ว ทันใจ", 
                        desc: "รับใบเสนอราคาเบื้องต้นทางอีเมลภายใน 24 ชม. ทำงานในวันทำการ" 
                    },
                    { 
                        icon: ShieldCheck, 
                        title: "ถูกต้องตามกฎหมาย", 
                        desc: "หลักสูตรได้รับรองมาตรฐานและสามารถนำไปหักลดหย่อนภาษีได้ตามเงื่อนไข" 
                    },
                    { 
                        icon: MessageSquare, 
                        title: "ปรึกษาฟรี", 
                        desc: "ทีมงานพร้อมให้คำแนะนำในการปรับเนื้อหาให้ตรงกับหน้างานจริง" 
                    }
                ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 group-hover:border-primary/30 transition-colors">
                            <item.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                            <p className="text-sm text-muted-foreground font-light leading-snug">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <FileText size={80} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 text-center">ต้องการด่วน?</p>
                <p className="text-center font-bold text-xl mb-4">0-2582-2111</p>
                <div className="h-px bg-white/10 w-full mb-4" />
                <p className="text-[10px] text-center text-slate-400 font-light">ฝ่ายขายและการตลาดพร้อมดูแลคุณครับ</p>
            </div>
          </div>

          {/* Right Column: The Form */}
          <div className="lg:w-2/3 w-full">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-[600px] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground animate-pulse">กำลังเตรียมแบบฟอร์ม...</p>
                </div>
            }>
                <QuoteRequestForm courses={courses} />
            </Suspense>
          </div>

        </div>
      </div>
    </div>
  );
}
