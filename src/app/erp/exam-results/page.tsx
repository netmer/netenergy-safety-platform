import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { TrainingSchedule, Course } from '@/lib/course-data';
import { ExamResultsIndexClientPage } from './exam-results-index-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ExamResultsIndexPage() {
    noStore();

    const [schedulesSnap, coursesSnap] = await Promise.all([
        getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
        getDocs(query(collection(db, 'courses'))),
    ]);

    const schedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TrainingSchedule);
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Course);

    // Only show schedules where the course has an exam template
    const coursesWithExam = new Set(courses.filter(c => c.examTemplateId).map(c => c.id));
    const filteredSchedules = schedules.filter(s => coursesWithExam.has(s.courseId));

    return <ExamResultsIndexClientPage schedules={filteredSchedules} courses={courses} />;
}
