'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Certification } from '@/lib/course-data';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Award, ShieldCheck, Maximize2, Download, FileText, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CertificationsSectionProps {
  certifications: Certification[];
}

export function CertificationsSection({ certifications }: CertificationsSectionProps) {
  if (!certifications || certifications.length === 0) return null;

  // Split first item as featured
  const [featured, ...others] = certifications;

  return (
    <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Dynamic Background Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 text-center md:text-left">
          <div className="max-w-2xl mx-auto md:mx-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold mb-4 border border-primary/20 uppercase tracking-widest"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Quality & Standards
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black font-headline tracking-tight leading-none"
            >
              การรับรอง<span className="text-primary">มาตรฐาน</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-4 text-sm md:text-lg font-light"
            >
              ศูนย์ฝึกอบรมของเราได้รับการรับรองความถูกต้องตามกฎหมาย และมาตรฐานสากล
            </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Featured Large Certificate (A4 Ratio) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-7 flex justify-center"
          >
            <Dialog>
              <DialogTrigger asChild>
                <div className="group cursor-pointer perspective-1000 w-full max-w-[450px]">
                  <motion.div 
                    whileHover={{ y: -10, rotateY: -2 }}
                    className="relative aspect-[1/1.414] w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ring-1 ring-black/5"
                  >
                    <CertificatePreview url={featured.image} title={featured.title} hint={featured.hint} isFeatured />
                    
                    {/* Glass Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 md:p-8 text-white">
                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                            <Badge className="mb-3 bg-primary text-white border-none font-bold uppercase tracking-widest text-[10px]">Featured Certificate</Badge>
                            <h3 className="text-xl md:text-2xl font-bold leading-tight mb-2 font-headline">{featured.title}</h3>
                            <p className="text-white/70 text-xs mb-6 font-light">{featured.issuer}</p>
                            <div className="inline-flex items-center gap-2 font-bold text-sm bg-white text-slate-900 px-6 py-3 rounded-xl shadow-xl">
                                <Maximize2 className="w-4 h-4" /> ดูฉบับเต็ม
                            </div>
                        </div>
                    </div>
                  </motion.div>
                </div>
              </DialogTrigger>
              <CertificationModalContent cert={featured} />
            </Dialog>
          </motion.div>

          {/* Compact Thumbnails Grid */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                <Award className="w-4 h-4" /> รายการใบรับรองเพิ่มเติม ({others.length})
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pb-4">
              {others.map((cert, index) => (
                <Dialog key={cert.id}>
                  <DialogTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative aspect-[1/1.414] rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 ring-1 ring-slate-200 dark:ring-slate-800 bg-white"
                    >
                      <CertificatePreview url={cert.image} title={cert.title} hint={cert.hint} />
                      <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                         <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  <CertificationModalContent cert={cert} />
                </Dialog>
              ))}
            </div>

            <div className="mt-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hidden lg:block">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-bold text-sm mb-1">มาตรฐานการันตี 100%</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            เรายึดมั่นในความถูกต้องและโปร่งใสของศูนย์ฝึกอบรมที่ได้รับรองตามกฎหมาย
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(59, 130, 246, 0.2);
          border-radius: 20px;
        }
        .perspective-1000 {
            perspective: 1000px;
        }
      `}} />
    </section>
  );
}

function CertificatePreview({ url, title, hint, isFeatured = false }: { url: string, title: string, hint: string, isFeatured?: boolean }) {
  const isPdf = url?.toLowerCase().includes('.pdf');

  // ON MOBILE: PDF iframes often cause viewport jumping or automatic file opening behavior.
  // FIX: We show a professional placeholder/icon for PDFs in the preview grid, 
  // and only render the PDF in the Dialog Modal when explicitly clicked.
  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-3 p-6 text-center select-none group-hover:bg-slate-100 transition-colors">
        <div className="relative">
            <FileSearch className="w-12 h-12 md:w-16 md:h-16 text-primary/40 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">PDF</div>
        </div>
        <div className="space-y-1">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-2 px-2">{title}</p>
            <p className="text-[8px] text-primary/60 font-bold uppercase tracking-tighter">Click to view full doc</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={url || "https://picsum.photos/seed/cert/600/848"}
      alt={title}
      fill
      className="object-cover transition-transform duration-700 group-hover:scale-105"
      data-ai-hint={hint}
      priority={isFeatured}
    />
  );
}

function CertificationModalContent({ cert }: { cert: Certification }) {
  const isPdf = cert.image?.toLowerCase().includes('.pdf');

  return (
    <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-[90vh]">
      <DialogTitle className="sr-only">{cert.title}</DialogTitle>
      <DialogDescription className="sr-only">แสดงเอกสารฉบับเต็มของ {cert.title}</DialogDescription>
      
      {/* Modal Header */}
      <div className="p-4 border-b flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <h4 className="font-bold text-sm md:text-base leading-tight truncate">{cert.title}</h4>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{cert.issuer}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full shrink-0" asChild>
                <a href={cert.image} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">ดาวน์โหลด</span>
                </a>
            </Button>
        </div>
      </div>

      {/* Modal Body - Scrollable */}
      <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-y-auto p-4 md:p-10 flex justify-center custom-scrollbar">
        <div className="relative w-full max-w-[800px] aspect-[1/1.414] bg-white shadow-2xl rounded-sm ring-1 ring-black/5">
            {isPdf ? (
                <iframe 
                    src={`${cert.image}#toolbar=0&navpanes=0&scrollbar=0`} 
                    className="w-full h-full border-none rounded-sm"
                    title={cert.title}
                />
            ) : (
                <Image
                    src={cert.image || "https://picsum.photos/seed/full/1200/1696"}
                    alt={cert.title}
                    fill
                    className="object-contain rounded-sm"
                    quality={100}
                />
            )}
        </div>
      </div>
    </DialogContent>
  );
}
