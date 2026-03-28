
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { TrainingSchedule, Course, CourseCategory, Instructor, Client } from '@/lib/course-data';
import { ScheduleClientPage } from './schedule-client-page';
import { unstable_noStore as noStore } from 'next/cache';

// Helper to safely convert Firestore Timestamps to ISO strings
const toISOStringSafe = (date: any): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date.toDate) return date.toDate().toISOString();
    try {
      return new Date(date).toISOString();
    } catch {
      return null;
    }
};


export default async function ManageSchedulePage() {
  noStore();

  const [allSchedules, allCourses, allCategories, allInstructors, allClients] = await Promise.all([
    getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
    getDocs(query(collection(db, 'courses'), orderBy('orderIndex', 'asc'))),
    getDocs(query(collection(db, 'courseCategories'), orderBy('orderIndex', 'asc'))),
    getDocs(query(collection(db, 'instructors'), orderBy('name'))),
    getDocs(query(collection(db, 'clients'), orderBy('companyName'))),
  ]);

  const schedules = allSchedules.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: toISOStringSafe(data.startDate) || '',
        endDate: toISOStringSafe(data.endDate) || '',
      } as TrainingSchedule
  });
  const courses = allCourses.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
  const categories = allCategories.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));
  const instructors = allInstructors.docs.map(doc => ({ id: doc.id, ...doc.data() } as Instructor));
  const clients = allClients.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));

  return (
    <ScheduleClientPage
        schedules={schedules}
        courses={courses}
        categories={categories}
        instructors={instructors}
        clients={clients}
    />
  );
}
