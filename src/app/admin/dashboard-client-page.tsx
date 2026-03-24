'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PageViewData, ReferrerData, DailyVisitorsData } from '@/lib/course-data';
import { Eye, Users, BookOpen, ClipboardList } from 'lucide-react';

interface DashboardClientPageProps {
    keyMetrics: {
        totalUsers: number;
        totalRegistrations: number;
        activeCourses: number;
        totalPageViews: number;
        uniqueVisitors: number;
    };
    dailyVisitorsData: DailyVisitorsData[];
    topPagesData: PageViewData[];
    topReferrersData: ReferrerData[];
    topCoursePagesData: PageViewData[];
    coursesMap: Record<string, string>;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function DashboardClientPage({
    keyMetrics,
    dailyVisitorsData,
    topPagesData,
    topReferrersData,
    coursesMap
}: DashboardClientPageProps) {

    const formattedDailyData = dailyVisitorsData.map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short'}),
    }));

    return (
        <div className="space-y-8 text-left">
            <h1 className="text-2xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">Admin Overview</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[
                    { label: 'Page Views', val: keyMetrics.totalPageViews, icon: Eye, sub: 'Last 30 Days' },
                    { label: 'Unique Visitors', val: keyMetrics.uniqueVisitors, icon: Users, sub: 'Last 30 Days' },
                    { label: 'Total Users', val: keyMetrics.totalUsers, icon: Users, sub: 'All Registered' },
                    { label: 'Applications', val: keyMetrics.totalRegistrations, icon: ClipboardList, sub: 'All Rounds' },
                    { label: 'Active Sessions', val: keyMetrics.activeCourses, icon: BookOpen, sub: 'Upcoming' },
                ].map((m, i) => (
                    <Card key={i} className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</CardTitle>
                            <m.icon className="h-4 w-4 text-primary opacity-40" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-headline">{m.val.toLocaleString()}</div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">{m.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-slate-900">
                <CardHeader><CardTitle className="text-lg font-bold font-headline">Daily Traffic Trend</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={formattedDailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false}/>
                                <Tooltip cursor={{fill: 'hsl(var(--primary)/0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="visitors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader><CardTitle className="text-lg font-bold font-headline">Most Visited Pages</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead className="text-[10px] uppercase font-bold tracking-widest">Page Path</TableHead><TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">Views</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {topPagesData.map(page => (
                                    <TableRow key={page.path}><TableCell className="font-semibold text-sm truncate max-w-[300px]">{page.path}</TableCell><TableCell className="text-right font-bold">{page.views.toLocaleString()}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader><CardTitle className="text-lg font-bold font-headline">Traffic Sources</CardTitle></CardHeader>
                    <CardContent>
                         <div className="h-[200px] w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={topReferrersData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="visitors" nameKey="referrer">{topReferrersData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                            {topReferrersData.map((ref, index) => (
                                <div key={ref.referrer} className="flex items-center justify-between text-xs font-semibold"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}/><span className="truncate max-w-[150px]">{ref.referrer}</span></div><span>{ref.visitors.toLocaleString()}</span></div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}