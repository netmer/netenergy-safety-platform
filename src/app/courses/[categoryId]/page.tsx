// @ts-nocheck
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, query, where, orderBy } from 'firebase/firestore';
import type { Course, CourseCategory } from '@/lib/course-data';
import CourseList from '@/components/course-list';
import Link from 'next/link';
import { ChevronRight, LayoutGrid, GitBranch, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

type Props = {
  params: { categoryId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryId } = await params;
  const categoryDocRef = doc(db, 'courseCategories', categoryId);
  const categoryDoc = await getDoc(categoryDocRef);

  if (!categoryDoc.exists()) {
    return {
      title: 'ไม่พบหมวดหมู่',
      description: 'หมวดหมู่หลักสูตรที่คุณกำลังค้นหาไม่มีอยู่ในระบบ',
    }
  }

  const category = categoryDoc.data() as CourseCategory;

  return {
    title: `หลักสูตรหมวดหมู่ ${category.title} | NetEnergy Safety Platform`,
    description: category.description,
    openGraph: {
      title: `หลักสูตรหมวดหมู่ ${category.title}`,
      description: category.description,
      images: [
        {
          url: category.image,
          width: 1200,
          height: 630,
          alt: category.title,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  const categoriesSnapshot = await getDocs(collection(db, 'courseCategories'));
  return categoriesSnapshot.docs.map((doc) => ({
    categoryId: doc.id,
  }));
}

export default async function CategoryCoursesPage({ params }: Props) {
  const { categoryId } = await params;

  const categoryDocRef = doc(db, 'courseCategories', categoryId);
  const categoryDoc = await getDoc(categoryDocRef);
  
  if (!categoryDoc.exists()) {
    notFound();
  }
  const category = { id: categoryDoc.id, ...categoryDoc.data() } as CourseCategory;

  // 1. Fetch sub-categories of this category
  const subCategoriesQuery = query(
    collection(db, 'courseCategories'),
    where('parentId', '==', categoryId),
    orderBy('orderIndex', 'asc')
  );
  const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
  const subCategories = subCategoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));

  // 2. Fetch courses of this category
  const coursesQuery = query(
    collection(db, 'courses'), 
    where('categoryId', '==', categoryId),
    orderBy('orderIndex', 'asc')
  );
  const coursesSnapshot = await getDocs(coursesQuery);
  const coursesInCategory = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

  // 3. Fetch Parent category for breadcrumb if this is a sub-category
  let parentCategory = null;
  if (category.parentId) {
      const parentDoc = await getDoc(doc(db, 'courseCategories', category.parentId));
      if (parentDoc.exists()) {
          parentCategory = { id: parentDoc.id, ...parentDoc.data() };
      }
  }

  return (
    <div className="py-12 md:py-20">
       <div className="mb-16">
        <nav aria-label="breadcrumb" className="flex items-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-8">
            <Link href="/courses" className="hover:text-primary transition-colors">Academy</Link>
            <ChevronRight className="h-3.5 w-3.5 mx-2 opacity-30" />
            {parentCategory && (
                <>
                    <Link href={`/courses/${parentCategory.id}`} className="hover:text-primary transition-colors">{parentCategory.title}</Link>
                    <ChevronRight className="h-3.5 w-3.5 mx-2 opacity-30" />
                </>
            )}
            <span className="text-slate-900 dark:text-white">{category.title}</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
                    {category.parentId ? <GitBranch className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                    {category.parentId ? 'Sub Category' : 'Course Category'}
                </div>
                <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter text-slate-900 dark:text-white leading-none">
                    {category.title}
                </h1>
                {category.description && (
                    <p className="mt-6 text-xl text-muted-foreground font-light leading-relaxed">
                        {category.description}
                    </p>
                )}
            </div>
            <div className="h-1 w-24 bg-primary rounded-full hidden md:block" />
        </div>
      </div>
      
      {/* If has sub-categories, show them instead of courses */}
      {subCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {subCategories.map((sub, index) => (
                  <Link key={sub.id} href={`/courses/${sub.id}`} className="group relative block h-[350px] rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
                      <Image
                        src={sub.image || `https://picsum.photos/seed/sub-${index}/800/600`}
                        alt={sub.title}
                        fill
                        priority={index < 2}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110 will-change-transform"
                        data-ai-hint={sub.hint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity"></div>
                      <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                          <h3 className="text-2xl font-bold font-headline mb-2">{sub.title}</h3>
                          <p className="text-xs text-slate-300 font-light line-clamp-2 mb-4">{sub.description}</p>
                          <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-primary">
                              เข้าดูหลักสูตร <ArrowRight className="ml-2 h-3.5 w-3.5 transform group-hover:translate-x-1.5 transition-transform" />
                          </div>
                      </div>
                  </Link>
              ))}
          </div>
      ) : (
          <CourseList courses={coursesInCategory} />
      )}
    </div>
  );
}
