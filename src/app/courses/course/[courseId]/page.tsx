
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDoc, getDocs, doc, query, where, orderBy } from 'firebase/firestore';
import type { Course, CourseCategory, TrainingSchedule } from '@/lib/course-data';
import { CourseDetailClientPage } from './course-detail-client-page';
import type { Metadata } from 'next';

export const revalidate = 60;

type Props = {
  params: { courseId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const courseDocRef = doc(db, 'courses', courseId);
  const courseDoc = await getDoc(courseDocRef);

  if (!courseDoc.exists()) {
    return {
      title: 'ไม่พบหลักสูตร',
      description: 'หลักสูตรที่คุณกำลังค้นหาอาจมีการเปลี่ยนแปลงหรือถูกย้ายไปที่หมวดหมู่อื่น',
    }
  }

  const course = courseDoc.data() as Course;

  return {
    title: `${course.title} | อบรมความปลอดภัย มาตรฐานปี 2568 | NET Safety`,
    description: `${course.description.slice(0, 160)}... หลักสูตรที่ได้รับรองตามกฎหมาย อบรม จป., ความปลอดภัยหน้างาน จัดโดยทีมงานผู้เชี่ยวชาญจาก NET Safety`,
    keywords: [course.title, 'อบรมความปลอดภัย', 'จป หัวหน้างาน', 'กฎหมายแรงงาน', 'ใบรับรองความปลอดภัย', ...(course.tags || [])],
    openGraph: {
      title: `${course.title} | NET Safety Platform`,
      description: course.description,
      images: [
        {
          url: course.image,
          width: 1200,
          height: 630,
          alt: course.title,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  try {
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    return coursesSnapshot.docs.map((doc) => ({
      courseId: doc.id,
    }));
  } catch (error) {
    console.error("Error generating static params for courses:", error);
    return [];
  }
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const courseDocRef = doc(db, 'courses', courseId);
  const courseDoc = await getDoc(courseDocRef);

  if (!courseDoc.exists()) {
    notFound();
  }
  const course = { id: courseDoc.id, ...courseDoc.data() } as Course;

  let category: CourseCategory | undefined = undefined;
  if (course.categoryId) {
    const categoryDocRef = doc(db, 'courseCategories', course.categoryId);
    const categoryDoc = await getDoc(categoryDocRef);
    if (categoryDoc.exists()) {
      category = { id: categoryDoc.id, ...categoryDoc.data() } as CourseCategory;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedulesQuery = query(
    collection(db, 'trainingSchedules'), 
    where('courseId', '==', courseId),
    where('endDate', '>=', today.toISOString().split('T')[0]),
    orderBy('endDate', 'asc')
  );

  const schedulesSnapshot = await getDocs(schedulesQuery);
  const activeSchedules = schedulesSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as TrainingSchedule))
    .filter(s => s.scheduleType !== 'inhouse'); // hide Inhouse-only schedules from public website
  
  // SEO Structured Data (JSON-LD)
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description,
    "provider": {
      "@type": "Organization",
      "name": "บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด",
      "logo": "https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e",
      "sameAs": "https://netenergy-safety-platform.web.app"
    },
    "hasCourseInstance": activeSchedules.map(s => ({
        "@type": "CourseInstance",
        "courseMode": "Offline",
        "location": s.location,
        "startDate": s.startDate,
        "endDate": s.endDate,
        "offers": {
            "@type": "Offer",
            "price": course.price?.replace(/[^0-9]/g, '') || "0",
            "priceCurrency": "THB"
        }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <div className="container mx-auto px-4">
        <CourseDetailClientPage 
            course={course}
            category={category}
            activeSchedules={activeSchedules}
        />
      </div>
    </>
  );
}
