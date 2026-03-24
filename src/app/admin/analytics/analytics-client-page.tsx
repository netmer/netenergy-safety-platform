
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PageViewData, ReferrerData, DailyVisitorsData } from '@/lib/course-data';
import { Eye, Users, Link as LinkIcon, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsClientPageProps {
    keyMetrics: {
        totalPageViews: number;
        uniqueVisitors: number;
        topCoursePage: PageViewData;
        topReferrer: ReferrerData;
    };
    dailyVisitorsData: DailyVisitorsData[];
    topPagesData: PageViewData[];
    topReferrersData: ReferrerData[];
    topCoursePagesData: PageViewData[];
    coursesMap: Record<string, string>; // Map of courseId -> courseTitle
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].name}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Visitors
            </span>
            <span className="font-bold">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};


export function AnalyticsClientPage({
    keyMetrics,
    dailyVisitorsData,
    topPagesData,
    topCoursePagesData,
    topReferrersData,
    coursesMap
}: AnalyticsClientPageProps) {

    const formattedDailyData = dailyVisitorsData.map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short'}),
    }));
    
    const getCourseNameFromPath = (path: string) => {
        if (!path.startsWith('/courses/course/')) return path;
        const courseId = path.split('/')[3];
        return coursesMap[courseId] || courseId;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Analytics</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Page Views (30d)</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{keyMetrics.totalPageViews.toLocaleString()}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Visitors (30d)</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{keyMetrics.uniqueVisitors.toLocaleString()}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Course (30d)</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize truncate" title={getCourseNameFromPath(keyMetrics.topCoursePage.path)}>
                            {getCourseNameFromPath(keyMetrics.topCoursePage.path)}
                        </div>
                        <p className="text-xs text-muted-foreground">{keyMetrics.topCoursePage.views.toLocaleString()} views</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Referrer (30d)</CardTitle>
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold truncate" title={keyMetrics.topReferrer.referrer}>{keyMetrics.topReferrer.referrer}</div>
                         <p className="text-xs text-muted-foreground">{keyMetrics.topReferrer.visitors.toLocaleString()} visitors</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daily Visitors (Last 30 Days)</CardTitle>
                    <CardDescription>Total page views per day.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={formattedDailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)',
                                    }}
                                />
                                <Bar dataKey="visitors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top Pages (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Path</TableHead>
                                    <TableHead className="text-right">Views</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topPagesData.map(page => (
                                    <TableRow key={page.path}>
                                        <TableCell className="font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={page.path}>{page.path}</TableCell>
                                        <TableCell className="text-right">{page.views.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Top Referrers (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="h-[240px] w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={topReferrersData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="visitors"
                                        nameKey="referrer"
                                    >
                                        {topReferrersData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Visitors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topReferrersData.map((ref, index) => (
                                    <TableRow key={ref.referrer}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}/>
                                            {ref.referrer}
                                        </TableCell>
                                        <TableCell className="text-right">{ref.visitors.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Most Viewed Courses (Last 30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Course</TableHead>
                                <TableHead className="text-right">Views</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topCoursePagesData.length > 0 ? topCoursePagesData.map(page => (
                                <TableRow key={page.path}>
                                    <TableCell className="font-medium">
                                        <Link href={page.path} className="hover:underline" target="_blank">
                                            {getCourseNameFromPath(page.path)}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-right">{page.views.toLocaleString()}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                                        No course pages were viewed in the last 30 days.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
