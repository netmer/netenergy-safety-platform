

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import type { TrainingSchedule, Course, CourseCategory, TrainingRecord, AttendeeData, RegistrationFormField } from '@/lib/course-data';
import { AttendeeManagementClientPage } from './attendee-management-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

// This page now only fetches metadata for filters, not the records themselves.
// Records and their associated attendee profiles are fetched on-demand by the client component.
export default async function ManageAttendeesPage() {
    const [schedulesSnapshot, coursesSnapshot, categoriesSnapshot, registrationsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
        getDocs(query(collection(db, 'courses'), orderBy('title'))),
        getDocs(query(collection(db, 'courseCategories'), orderBy('title'))),
        getDocs(query(collection(db, 'registrations'))), // Fetch registrations to get form schemas
    ]);

    const schedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingSchedule));
    const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory));

    // We only need the formSchema from each registration, not the full data.
    const registrations = registrationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            formSchema: data.formSchema as RegistrationFormField[]
        }
    });

    return <AttendeeManagementClientPage
        schedules={schedules}
        courses={courses}
        categories={categories}
        registrations={registrations}
    />;
}
