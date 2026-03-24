import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calendar, User, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { BlogPost } from '@/lib/blog-data';

export const metadata = {
  title: 'ข่าวสารและสาระน่ารู้ด้านความปลอดภัย | NET Safety Blog',
  description: 'ศูนย์รวมบทความและเทคนิคการจัดการความปลอดภัยในที่ทำงาน อัปเดตกฎหมายแรงงานใหม่ๆ และความรู้เพื่อชาว จป. ทุกระดับชั้น',
};

export default async function BlogPage() {
  const postsQuery = query(collection(db, 'blogPosts'), orderBy('date', 'desc'));
  const postsSnapshot = await getDocs(postsQuery);
  const blogPosts = postsSnapshot.docs.map(doc => ({ slug: doc.id, ...doc.data() } as BlogPost));

  return (
    <div className="py-12 md:py-20">
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center p-2 px-4 bg-primary/10 rounded-full mb-6 text-primary font-bold text-sm">
            <BookOpen className="w-4 h-4 mr-2" /> คลังความรู้ความปลอดภัย
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-headline leading-tight tracking-tight text-slate-900 dark:text-white">
          สาระน่ารู้และกิจกรรมล่าสุด
        </h1>
        <p className="mt-6 text-lg text-muted-foreground font-light leading-relaxed">
          อัปเดตเทรนด์ความปลอดภัย กฎหมายใหม่ปี 2568 และเคล็ดลับการลดอุบัติเหตุในที่ทำงานจากประสบการณ์จริงของวิทยากรทีมงาน NET
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {blogPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
            <Card className="flex flex-col h-full transition-all duration-500 group-hover:shadow-2xl group-hover:border-primary/30 rounded-[2rem] overflow-hidden border-slate-100 dark:border-slate-800">
              <CardHeader className="p-0 overflow-hidden">
                <Image
                  src={post.image}
                  alt={post.title}
                  width={600}
                  height={338}
                  className="object-cover aspect-video transition-transform duration-700 group-hover:scale-110"
                  data-ai-hint={post.hint}
                />
              </CardHeader>
              <CardContent className="pt-8 flex-grow flex flex-col px-8">
                <div className="mb-4">
                  <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 border-none font-bold uppercase tracking-wider text-[10px]">{post.category}</Badge>
                </div>
                <CardTitle className="text-xl font-semibold leading-tight flex-grow font-headline group-hover:text-primary transition-colors text-slate-900 dark:text-white">{post.title}</CardTitle>
                <p className="mt-4 text-muted-foreground text-sm line-clamp-3 font-light leading-relaxed">{post.excerpt}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center text-xs text-muted-foreground pt-6 px-8 pb-8 border-t border-slate-50 dark:border-slate-800/50">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{new Date(post.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                 </div>
                 <div className="flex items-center text-primary font-bold transition-all group-hover:gap-2">
                  <span className="hidden sm:inline">อ่านบทความ</span> <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
      
      {blogPosts.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed rounded-[2.5rem]">
              <p className="text-muted-foreground italic font-light">กำลังจัดเตรียมบทความสาระน่ารู้ใหม่ๆ โปรดติดตามเร็วๆ นี้...</p>
          </div>
      )}
    </div>
  );
}