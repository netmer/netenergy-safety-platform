import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import type { TrainingSchedule, EvaluationSession } from '@/lib/course-data';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default async function EvaluationResultsPage() {
    noStore();

    const [schedulesSnap, sessionsSnap] = await Promise.all([
        getDocs(query(collection(db, 'trainingSchedules'), orderBy('startDate', 'desc'))),
        getDocs(collection(db, 'evaluationSessions')),
    ]);

    const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as EvaluationSession);
    const sessionsBySchedule = new Map<string, EvaluationSession[]>();
    for (const s of allSessions) {
        if (!sessionsBySchedule.has(s.scheduleId)) sessionsBySchedule.set(s.scheduleId, []);
        sessionsBySchedule.get(s.scheduleId)!.push(s);
    }

    const schedules = schedulesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as TrainingSchedule)
        .filter(s => (sessionsBySchedule.get(s.id)?.length ?? 0) > 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                    <ClipboardCheck className="w-6 h-6 text-violet-600" /> ผลการประเมิน
                </h1>
                <p className="text-muted-foreground text-sm mt-1">ผลการประเมินความพึงพอใจจากผู้อบรม</p>
            </div>

            {schedules.length === 0 ? (
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <ClipboardCheck className="w-10 h-10 opacity-30" />
                        <p>ยังไม่มีผลการประเมิน</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {schedules.map(schedule => {
                        const sessions = sessionsBySchedule.get(schedule.id) ?? [];
                        const avg = sessions.length > 0
                            ? sessions.reduce((s, e) => s + e.averageScore, 0) / sessions.length
                            : 0;
                        return (
                            <Link key={schedule.id} href={`/erp/evaluation-results/${schedule.id}`}>
                                <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{schedule.courseTitle}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {format(new Date(schedule.startDate), 'd MMM yyyy', { locale: th })}
                                                {' · '}{schedule.location}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs">
                                                {sessions.length} คน
                                            </Badge>
                                            <p className="text-sm font-bold mt-1" style={{ color: avg >= 8 ? '#059669' : avg >= 6 ? '#16a34a' : avg >= 4 ? '#ca8a04' : '#ef4444' }}>
                                                {avg.toFixed(1)} / 10
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
