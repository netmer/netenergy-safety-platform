
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, format, startOfDay } from 'date-fns';
import { AnalyticsClientPage } from './analytics-client-page';
import type { PageViewData, ReferrerData, DailyVisitorsData, Course } from '@/lib/course-data';

async function getAnalyticsData() {
    noStore();

    const thirtyDaysAgo = subDays(new Date(), 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // === Fetch all pageview events from the last 30 days ===
    const eventsQuery = query(
        collection(db, 'analyticsEvents'),
        where('eventType', '==', 'pageview'),
        where('timestamp', '>=', thirtyDaysAgoISO)
    );
    const eventsSnapshot = await getDocs(eventsQuery);
    const recentEvents = eventsSnapshot.docs.map(doc => doc.data());
    
    // === Fetch all courses for mapping IDs to titles ===
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const coursesMap = coursesSnapshot.docs.reduce((acc, doc) => {
        const course = doc.data() as Omit<Course, 'id'>;
        acc[doc.id] = course.shortName || course.title;
        return acc;
    }, {} as Record<string, string>);

    // === Daily Visitors for the last 30 days ===
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyCounts[date] = 0;
    }

    recentEvents.forEach(event => {
        const timestamp = new Date(event.timestamp);
        const date = format(timestamp, 'yyyy-MM-dd');
        if (dailyCounts[date] !== undefined) {
            dailyCounts[date]++;
        }
    });

    const dailyVisitorsData: DailyVisitorsData[] = Object.entries(dailyCounts)
        .map(([date, visitors]) => ({ date, visitors }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    // === Key Metrics, Top Pages, Top Referrers, Top Courses (from last 30 days) ===
    const pageCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};
    const coursePageCounts: Record<string, number> = {};
    const uniqueVisitorIds = new Set<string>();

    recentEvents.forEach(event => {
        // Page counts
        const path = event.path || '/';
        pageCounts[path] = (pageCounts[path] || 0) + 1;
        
        // Unique visitors (using userId if available, otherwise path+referrer as a fallback)
        if(event.userId) {
            uniqueVisitorIds.add(event.userId);
        }

        // Top Course Pages
        if (path.startsWith('/courses/course/')) {
            const coursePath = path.split('?')[0]; // Ignore query params
            coursePageCounts[coursePath] = (coursePageCounts[coursePath] || 0) + 1;
        }

        // Referrer counts
        let referrer = 'Direct';
        if (event.referrer && !event.referrer.includes(process.env.NEXT_PUBLIC_HOST as string)) {
            try {
                const url = new URL(event.referrer);
                referrer = url.hostname.replace(/^www\./, '');
            } catch (e) {
                // Ignore invalid URLs
            }
        }
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
    });

    const topPagesData: PageViewData[] = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    
    const topCoursePagesData: PageViewData[] = Object.entries(coursePageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

    const topReferrersData: ReferrerData[] = Object.entries(referrerCounts)
        .map(([referrer, visitors]) => ({ referrer, visitors }))
        .sort((a, b) => b.visitors - a.visitors)
        .slice(0, 10);

    const keyMetrics = {
        totalPageViews: recentEvents.length,
        uniqueVisitors: uniqueVisitorIds.size,
        topCoursePage: topCoursePagesData[0] ? topCoursePagesData[0] : { path: 'N/A', views: 0},
        topReferrer: topReferrersData[0] ? topReferrersData[0] : { referrer: 'N/A', visitors: 0 }
    }

    return { keyMetrics, dailyVisitorsData, topPagesData, topReferrersData, topCoursePagesData, coursesMap };
}

export default async function AnalyticsPage() {
    const data = await getAnalyticsData();
    return <AnalyticsClientPage {...data} />;
}
