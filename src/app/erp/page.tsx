

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, getCountFromServer } from 'firebase/firestore';
import type { TrainingSchedule, Registration, Course, TrainingRecord } from '@/lib/course-data';
import { ErpDashboardClientPage } from './dashboard-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

async function getDashboardData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // --- Key Metrics ---
    const activeSchedulesQuery = query(
        collection(db, 'trainingSchedules'), 
        where('status', '==', 'เปิดรับสมัคร'),
        where('startDate', '>=', today.toISOString().split('T')[0])
    );
    const pendingRegistrationsQuery = query(collection(db, 'registrations'), where('status', '==', 'pending'));
    const pendingVerificationQuery = query(collection(db, 'trainingRecords'), where('status', '==', 'pending_verification'));
    
    const in90Days = new Date();
    in90Days.setDate(today.getDate() + 90);
    const expiringSoonQuery = query(
        collection(db, 'trainingRecords'),
        where('status', '==', 'completed'),
        where('expiryDate', '!=', null),
        where('expiryDate', '>=', today.toISOString()),
        where('expiryDate', '<=', in90Days.toISOString())
    );

    const docsVerifiedQuery = query(collection(db, 'trainingRecords'), where('status', '==', 'docs_verified'));
    const completedNoCertQuery = query(collection(db, 'trainingRecords'), where('status', '==', 'completed'));
    const pendingDeliveryQuery = query(collection(db, 'deliveryPackages'), where('overallStatus', '==', 'รอดำเนินการ'));

    const [
        activeSchedulesSnapshot,
        pendingRegistrationsSnapshot,
        pendingVerificationSnapshot,
        expiringSoonCountSnapshot,
        docsVerifiedSnapshot,
        completedNoCertSnapshot,
        pendingDeliverySnapshot,
    ] = await Promise.all([
        getDocs(activeSchedulesQuery),
        getCountFromServer(pendingRegistrationsQuery),
        getCountFromServer(pendingVerificationQuery),
        getCountFromServer(expiringSoonQuery),
        getCountFromServer(docsVerifiedQuery),
        getCountFromServer(completedNoCertQuery),
        getCountFromServer(pendingDeliveryQuery),
    ]);

    const keyMetrics = {
        activeSchedules: activeSchedulesSnapshot.size,
        pendingRegistrations: pendingRegistrationsSnapshot.data().count,
        pendingVerification: pendingVerificationSnapshot.data().count,
        expiringSoon: expiringSoonCountSnapshot.data().count,
    };

    const pipeline = {
        pendingRegistrations: pendingRegistrationsSnapshot.data().count,
        pendingVerification: pendingVerificationSnapshot.data().count,
        docsVerified: docsVerifiedSnapshot.data().count,
        completedNoCert: completedNoCertSnapshot.data().count,
        pendingDelivery: pendingDeliverySnapshot.data().count,
    };

    // --- Next Upcoming Schedule ---
    let upcomingScheduleData: (TrainingSchedule & { course: Course }) | null = null;
    const upcomingScheduleQuery = query(
        collection(db, 'trainingSchedules'),
        where('startDate', '>=', new Date().toISOString().split('T')[0]),
        orderBy('startDate', 'asc'),
        limit(1)
    );
    const upcomingScheduleSnapshot = await getDocs(upcomingScheduleQuery);
    if (!upcomingScheduleSnapshot.empty) {
        const scheduleDoc = upcomingScheduleSnapshot.docs[0];
        const schedule = { id: scheduleDoc.id, ...scheduleDoc.data() } as TrainingSchedule;
        
        const courseDocRef = doc(db, 'courses', schedule.courseId);
        const courseDoc = await getDoc(courseDocRef);
        if (courseDoc.exists()) {
            const courseData = {id: courseDoc.id, ...courseDoc.data()} as Course
            upcomingScheduleData = { ...schedule, course: { ...courseData, shortName: courseData.shortName || courseData.title } };
        }
    }


    // --- Recent Registrations ---
    const recentRegistrationsQuery = query(
        collection(db, 'registrations'), 
        orderBy('registrationDate', 'desc'), 
        limit(5)
    );
    const recentRegistrationsSnapshot = await getDocs(recentRegistrationsQuery);
    
    const registrations = recentRegistrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    
    const regCourseIds = [...new Set(registrations.map(reg => reg.courseId))];
    const regCoursesMap = new Map<string, Course>();
    if(regCourseIds.length > 0) {
        const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', regCourseIds));
        const coursesSnapshot = await getDocs(coursesQuery);
        coursesSnapshot.forEach(doc => {
            regCoursesMap.set(doc.id, {id: doc.id, ...doc.data()} as Course);
        });
    }

    const recentRegistrations = registrations.map(reg => ({
        ...reg,
        course: regCoursesMap.get(reg.courseId)
    }));

    // --- Expiring Records for Dashboard Table ---
    const topExpiringQuery = query(expiringSoonQuery, orderBy('expiryDate', 'asc'), limit(5));
    const topExpiringSnapshot = await getDocs(topExpiringQuery);
    const expiringRecords = topExpiringSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRecord));

    const expiringCourseIds = [...new Set(expiringRecords.map(r => r.courseId))];
    const expiringCoursesMap = new Map<string, Course>();
     if(expiringCourseIds.length > 0) {
        const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', expiringCourseIds));
        const coursesSnapshot = await getDocs(coursesQuery);
        coursesSnapshot.forEach(doc => {
            expiringCoursesMap.set(doc.id, {id: doc.id, ...doc.data()} as Course);
        });
    }

    const expiringRecordsWithCourses = expiringRecords.map(record => ({
        ...record,
        course: expiringCoursesMap.get(record.courseId)
    }));


    return {
        keyMetrics,
        pipeline,
        upcomingSchedule: upcomingScheduleData,
        recentRegistrations,
        expiringRecords: expiringRecordsWithCourses,
    };
}


export default async function ErpDashboard() {
  const data = await getDashboardData();
  return <ErpDashboardClientPage {...data} />;
}
