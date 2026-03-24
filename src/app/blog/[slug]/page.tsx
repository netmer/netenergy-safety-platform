import { notFound } from 'next/navigation';
import type { BlogPost } from '@/lib/blog-data';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, getDoc, getDocs, doc } from 'firebase/firestore';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const postDocRef = doc(db, 'blogPosts', slug);
  const postDoc = await getDoc(postDocRef);

  if (!postDoc.exists()) {
    return {
      title: 'ไม่พบบทความ',
      description: 'บทความที่คุณกำลังค้นหาไม่มีอยู่ในระบบ',
    }
  }

  const post = postDoc.data() as Omit<BlogPost, 'slug'>;

  return {
    title: `${post.title} | NetEnergy Safety Platform`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  const postsSnapshot = await getDocs(collection(db, 'blogPosts'));
  return postsSnapshot.docs.map((doc) => ({
    slug: doc.id,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const postDoc = await getDoc(doc(db, 'blogPosts', slug));

  if (!postDoc.exists()) {
    notFound();
  }
  
  const post = { slug: postDoc.id, ...postDoc.data() } as BlogPost;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NetEnergy Safety Platform',
      logo: {
        '@type': 'ImageObject',
        url: 'https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e',
      },
    },
    datePublished: post.date,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="py-12 md:py-20 max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4">
            <Link href="/blog" className="hover:text-primary transition-colors">ข่าวสารและบทความ</Link>
            <ChevronRight className="h-3 w-3 mx-2 opacity-30" />
            <span className="text-foreground">{post.title}</span>
          </div>
          <Badge variant="secondary" className="mb-4 bg-primary/5 text-primary border-none font-bold uppercase tracking-widest text-[10px]">{post.category}</Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold font-headline leading-tight tracking-tight text-slate-900 dark:text-white">
            {post.title}
          </h1>
          <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary opacity-70" />
                  <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary opacity-70" />
                  <span>{new Date(post.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
          </div>
        </div>
        
        <Image
          src={post.image}
          alt={post.title}
          width={1200}
          height={675}
          className="rounded-3xl object-cover aspect-video mb-12 shadow-2xl"
          data-ai-hint={post.hint}
        />
        
        <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed font-light">
          <p className="text-xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{post.excerpt}</p>
          <div className="h-px w-20 bg-primary/30 my-8" />
          <p>เนื้อหาบทความฉบับเต็มจะแสดงที่นี่... Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        </div>

      </div>
    </>
  );
}