

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { TrainingRecord, TrainingSchedule, Course, CourseCategory, CertificateTemplate as TemplateType } from '@/lib/course-data';
import { CertificateClientPage } from './certificate-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

async function getCertificatePageData() {
    try {
        // Fetch only metadata for filters, not all records
        const [schedulesSnapshot, coursesSnapshot, categoriesSnapshot, templatesSnapshot, completedRecordsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
            getDocs(query(collection(db, 'courses'), orderBy('title'))),
            getDocs(query(collection(db, 'courseCategories'), orderBy('title'))),
            getDocs(collection(db, 'certificateTemplates')),
            getDocs(query(collection(db, 'trainingRecords'), where('status', '==', 'completed'))), // Still need this for initial view
        ]);

        const schedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingSchedule));
        const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
        const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TemplateType));
        const records = completedRecordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRecord));

        return { records, schedules, courses, categories, templates };
    } catch (error) {
        console.error("Failed to fetch certificate page data:", error);
        return { records: [], schedules: [], courses: [], categories: [], templates: [] };
    }
}


export default async function CertificatePage({ searchParams }: { searchParams: Promise<{ scheduleId?: string }> }) {
    const { scheduleId } = await searchParams;
    const data = await getCertificatePageData();
    return (
        <div className="space-y-8">
            <CertificateClientPage {...data} initialScheduleId={scheduleId ?? null} />
        </div>
    );
}
