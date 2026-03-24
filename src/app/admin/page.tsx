

import { unstable_noStore as noStore } from 'next/cache';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'firebase/firestore';
import type { PageViewData, ReferrerData, DailyVisitorsData, Course, TrainingSchedule } from '@/lib/course-data';
import { DashboardClientPage } from './dashboard-client-page';


async function getDashboardData() {
    noStore();

    // === Basic Stats ===
    const usersCollection = collection(db, 'users');
    const registrationsCollection = collection(db, 'registrations');
    const activeCoursesQuery = query(collection(db, 'trainingSchedules'), where('status', '==', 'เปิดรับสมัคร'));
    
    const [usersSnapshot, registrationsSnapshot, activeCoursesSnapshot] = await Promise.all([
        getCountFromServer(usersCollection),
        getCountFromServer(registrationsCollection),
        getDocs(activeCoursesQuery)
    ]);
    
    const uniqueActiveCourseIds = new Set(activeCoursesSnapshot.docs.map(doc => doc.data().courseId));

    // === Analytics Data (from last 30 days) ===
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const eventsQuery = query(
        collection(db, 'analyticsEvents'),
        where('eventType', '==', 'pageview'),
        where('timestamp', '>=', thirtyDaysAgoISO)
    );
    const eventsSnapshot = await getDocs(eventsQuery);
    const recentEvents = eventsSnapshot.docs.map(doc => doc.data());
    
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const coursesMap = coursesSnapshot.docs.reduce((acc, doc) => {
        const course = doc.data() as Omit<Course, 'id'>;
        acc[doc.id] = course.shortName || course.title;
        return acc;
    }, {} as Record<string, string>);

    // Daily Visitors
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyCounts[date.toISOString().split('T')[0]] = 0;
    }
    recentEvents.forEach(event => {
        const date = event.timestamp.split('T')[0];
        if (dailyCounts[date] !== undefined) {
            dailyCounts[date]++;
        }
    });
    const dailyVisitorsData: DailyVisitorsData[] = Object.entries(dailyCounts)
        .map(([date, visitors]) => ({ date, visitors }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Top Pages, Referrers, Courses
    const pageCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};
    const coursePageCounts: Record<string, number> = {};
    const uniqueVisitorIds = new Set<string>();

    recentEvents.forEach(event => {
        const path = event.path || '/';
        pageCounts[path] = (pageCounts[path] || 0) + 1;
        if(event.userId) uniqueVisitorIds.add(event.userId);
        if (path.startsWith('/courses/course/')) {
            const coursePath = path.split('?')[0];
            coursePageCounts[coursePath] = (coursePageCounts[coursePath] || 0) + 1;
        }
        let referrer = 'Direct';
        if (event.referrer && !event.referrer.includes(process.env.NEXT_PUBLIC_HOST as string)) {
            try {
                const url = new URL(event.referrer);
                referrer = url.hostname.replace(/^www\./, '');
            } catch (e) {}
        }
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
    });

    const topPagesData: PageViewData[] = Object.entries(pageCounts).map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 10);
    const topCoursePagesData: PageViewData[] = Object.entries(coursePageCounts).map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 5);
    const topReferrersData: ReferrerData[] = Object.entries(referrerCounts).map(([referrer, visitors]) => ({ referrer, visitors })).sort((a, b) => b.visitors - a.visitors).slice(0, 10);

    const keyMetrics = {
        totalUsers: usersSnapshot.data().count,
        totalRegistrations: registrationsSnapshot.data().count,
        activeCourses: uniqueActiveCourseIds.size,
        totalPageViews: recentEvents.length,
        uniqueVisitors: uniqueVisitorIds.size,
    }

    return { keyMetrics, dailyVisitorsData, topPagesData, topReferrersData, topCoursePagesData, coursesMap };
}

export default async function AdminDashboard() {
  const data = await getDashboardData();
  return <DashboardClientPage {...data} />;
}
