'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowRight, 
  Sparkles, 
  BarChart, 
  Search as SearchIcon 
} from 'lucide-react';
import type { Course } from '@/lib/course-data';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CourseListProps {
  courses: Course[];
}

export default function CourseList({ courses }: CourseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด');

  const courseTypes = useMemo(() => {
    const typesSet = new Set<string>();
    courses.forEach(c => {
      if (Array.isArray(c.type)) {
        c.type.forEach(t => {
          if (t && t !== 'none') typesSet.add(t);
        });
      } else if (typeof c.type === 'string' && c.type && c.type !== 'none') {
        typesSet.add(c.type);
      }
    });
    
    if (typesSet.size === 0) return [];
    return ['ทั้งหมด', ...Array.from(typesSet)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Handle array type check
      const courseTypes = Array.isArray(course.type) ? course.type : (course.type ? [course.type] : []);
      const matchesFilter = activeFilter === 'ทั้งหมด' || courseTypes.includes(activeFilter);
      
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [courses, searchQuery, activeFilter]);

  return (
    <div className="space-y-10">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-6 sticky top-0 z-30 bg-background/95 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:max-w-sm">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    type="search"
                    placeholder="ค้นหาหลักสูตร..."
                    className="pl-11 h-12 rounded-xl border-none bg-slate-100 dark:bg-slate-900 shadow-inner focus-visible:ring-primary/20 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            {courseTypes.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 lg:pb-0">
                    {courseTypes.map(type => (
                        <Button
                            key={type}
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveFilter(type)}
                            className={cn(
                                "rounded-lg px-4 h-9 font-bold transition-all whitespace-nowrap border-2 text-xs",
                                activeFilter === type 
                                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20 hover:bg-primary/90" 
                                    : "bg-background border-slate-100 dark:border-slate-800 text-slate-500 hover:border-primary/30 hover:text-primary"
                            )}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Grid Results */}
      <AnimatePresence mode='wait'>
        {filteredCourses.length > 0 ? (
            <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6"
            >
            {filteredCourses.map((course, index) => (
                <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                >
                    <Link href={`/courses/course/${course.id}`} className="group block h-full">
                    <Card className="flex flex-col h-full overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 will-change-transform bg-white dark:bg-slate-950 rounded-[1.5rem]">
                        <div className="relative aspect-[16/10] overflow-hidden">
                            <Image
                                src={course.image || `https://picsum.photos/seed/course-${course.id}/600/400`}
                                alt={course.title}
                                fill
                                priority={index < 4}
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-110 will-change-transform"
                                data-ai-hint={course.hint || "safety training"}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/10 to-transparent" />
                            
                            {course.price && course.price.toLowerCase() !== 'none' && (
                                <div className="absolute top-3 left-3">
                                    <Badge className="bg-primary text-white font-bold px-3 py-1 rounded-lg border-none shadow-lg text-[10px]">
                                        {course.price}
                                    </Badge>
                                </div>
                            )}

                            <div className="absolute bottom-3 left-3 right-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {(course.tags || []).slice(0, 2).map(tag => (
                                        <Badge key={tag} className="bg-white/10 backdrop-blur-md text-white border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <CardContent className="flex-grow p-5">
                             <div className="flex flex-wrap items-center gap-2 mb-3">
                                {Array.isArray(course.type) ? course.type.map(t => (
                                    <div key={t} className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-widest border border-primary/10">
                                        <BarChart className="w-2.5 h-2.5" /> {t}
                                    </div>
                                )) : (course.type && course.type !== 'none' && (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-widest border border-primary/10">
                                        <BarChart className="w-2.5 h-2.5" /> {course.type}
                                    </div>
                                ))}
                             </div>
                            <h3 className="text-lg font-bold leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors font-headline text-slate-900 dark:text-white">
                                {course.title}
                            </h3>
                            {course.description && (
                                <p className="text-slate-500 text-[13px] line-clamp-2 leading-relaxed font-light">
                                    {course.description}
                                </p>
                            )}
                        </CardContent>
                        
                        <CardFooter className="px-5 pb-5 pt-0">
                            <div className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-900 group-hover:bg-primary transition-all duration-500 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30">
                                <span>ดูรายละเอียด</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
                            </div>
                        </CardFooter>
                    </Card>
                    </Link>
                </motion.div>
            ))}
            </motion.div>
        ) : (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] bg-slate-50/50 dark:bg-slate-950/50"
            >
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <SearchIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-headline">ไม่พบหลักสูตรที่คุณต้องการ</h3>
                <p className="text-muted-foreground mb-8 font-light text-sm">
                    ลองใช้คำค้นหาอื่น หรือให้ AI ช่วยแนะนำหลักสูตรที่จำเป็นสำหรับองค์กรของคุณครับ
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button variant="outline" size="sm" className="rounded-xl px-6 h-11 font-bold" onClick={() => { setSearchQuery(''); setActiveFilter('ทั้งหมด'); }}>
                        ล้างการค้นหา
                    </Button>
                    <Button size="sm" className="rounded-xl px-6 h-11 font-bold shadow-lg shadow-primary/20" asChild>
                        <Link href="/compliance-checker"><Sparkles className="mr-2 h-4 w-4"/> ให้ AI ช่วยแนะนำ</Link>
                    </Button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
