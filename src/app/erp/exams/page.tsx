import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { ExamTemplate, Course, CourseCategory } from '@/lib/course-data';
import { ExamsClientPage } from './exams-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ExamsPage() {
    noStore();

    const [templatesSnap, coursesSnap, categoriesSnap] = await Promise.all([
        getDocs(query(collection(db, 'examTemplates'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'courses'), orderBy('title', 'asc'))),
        getDocs(query(collection(db, 'courseCategories'), orderBy('title', 'asc'))),
    ]);

    const templates = templatesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamTemplate);
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Course);
    const categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as CourseCategory);

    return <ExamsClientPage templates={templates} courses={courses} categories={categories} basePath="/erp/exams" />;
}
