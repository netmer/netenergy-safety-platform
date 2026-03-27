'use client';

import React, { useMemo } from 'react';
import type { TrainingSchedule, EvaluationTemplate, EvaluationSession } from '@/lib/course-data';
import { EmojiFace } from '@/components/eval/emoji-face';
import { getScoreColor } from '@/lib/evaluation-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Users, BarChart2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
    const pct = Math.round((score / max) * 100);
    const color = getScoreColor(Math.round(score));
    return (
        <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-sm font-bold w-8 text-right tabular-nums" style={{ color }}>
                {score.toFixed(1)}
            </span>
        </div>
    );
}

function DistributionBar({ ratings }: { ratings: number[] }) {
    const counts = Array.from({ length: 10 }, (_, i) => ratings.filter(r => r === i + 1).length);
    const max = Math.max(...counts, 1);
    const COLORS = ['#ef4444','#ef4444','#f97316','#f97316','#facc15','#facc15','#4ade80','#4ade80','#10b981','#10b981'];
    return (
        <div className="flex items-end gap-0.5 h-8">
            {counts.map((c, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-sm min-h-[2px] transition-all"
                    style={{ height: `${Math.max(4, (c / max) * 32)}px`, backgroundColor: COLORS[i], opacity: c === 0 ? 0.2 : 1 }}
                    title={`${i + 1}: ${c} คน`}
                />
            ))}
        </div>
    );
}

export function EvalResultsClientPage({
    schedule, template, sessions,
}: {
    schedule: TrainingSchedule;
    template: EvaluationTemplate;
    sessions: EvaluationSession[];
}) {
    const overallAvg = useMemo(() => {
        if (sessions.length === 0) return 0;
        return sessions.reduce((s, e) => s + e.averageScore, 0) / sessions.length;
    }, [sessions]);

    const sectionStats = useMemo(() => {
        return template.sections.map(section => {
            const sectionAvgs = sessions
                .map(s => s.sectionAverages?.[section.id])
                .filter((v): v is number => typeof v === 'number');
            const avg = sectionAvgs.length > 0
                ? sectionAvgs.reduce((a, b) => a + b, 0) / sectionAvgs.length
                : 0;
            return { section, avg };
        });
    }, [template, sessions]);

    const itemStats = useMemo(() => {
        return template.sections.flatMap(section =>
            section.items.map(item => {
                const vals = sessions
                    .map(s => s.ratings?.[item.id])
                    .filter((v): v is number => typeof v === 'number');
                const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                return { section, item, avg, vals };
            })
        );
    }, [template, sessions]);

    const openStats = useMemo(() => {
        return template.openQuestions.map(q => ({
            question: q,
            answers: sessions
                .map(s => ({ name: s.attendeeName || 'ไม่ระบุชื่อ', answer: s.openAnswers?.[q.id] ?? '' }))
                .filter(a => a.answer.trim().length > 0),
        }));
    }, [template, sessions]);

    const dateStr = format(new Date(schedule.startDate), 'd MMMM yyyy', { locale: th });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                    <ClipboardCheck className="w-6 h-6 text-violet-600" /> ผลการประเมิน
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{schedule.courseTitle} · {dateStr} · {schedule.location}</p>
            </div>

            <Tabs defaultValue="overview">
                <TabsList className="rounded-xl w-full sm:w-auto">
                    <TabsTrigger value="overview" className="rounded-lg flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" /> ภาพรวม
                    </TabsTrigger>
                    <TabsTrigger value="items" className="rounded-lg flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4" /> รายหัวข้อ
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="rounded-lg flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> ความคิดเห็น
                    </TabsTrigger>
                </TabsList>

                {/* ── Overview Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="rounded-2xl border-none shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black">{sessions.length}</p>
                                    <p className="text-xs text-muted-foreground">ผู้ประเมิน</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-none shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <EmojiFace score={Math.round(overallAvg) || 5} size={40} />
                                <div>
                                    <p className="text-2xl font-black" style={{ color: getScoreColor(Math.round(overallAvg)) }}>
                                        {overallAvg.toFixed(1)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">คะแนนเฉลี่ยรวม / 10</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section averages */}
                    <Card className="rounded-2xl border-none shadow-sm">
                        <CardHeader><CardTitle className="text-base">คะแนนเฉลี่ยแต่ละส่วน</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {sectionStats.map(({ section, avg }) => (
                                <div key={section.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{section.title}</span>
                                        <EmojiFace score={Math.round(avg) || 5} size={28} />
                                    </div>
                                    <ScoreBar score={avg} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Items Tab ────────────────────────────────────────────────────── */}
                <TabsContent value="items" className="space-y-4 mt-4">
                    {template.sections.map(section => (
                        <Card key={section.id} className="rounded-2xl border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground">{section.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
                                {section.items.map(item => {
                                    const stat = itemStats.find(s => s.item.id === item.id);
                                    if (!stat) return null;
                                    return (
                                        <div key={item.id} className="py-3 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <EmojiFace score={Math.round(stat.avg) || 5} size={28} />
                                                <p className="text-sm flex-1 leading-snug">{item.label}</p>
                                            </div>
                                            <div className="flex items-center gap-3 pl-8">
                                                <ScoreBar score={stat.avg} />
                                                <DistributionBar ratings={stat.vals} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                {/* ── Comments Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="comments" className="space-y-6 mt-4">
                    {openStats.length === 0 ? (
                        <Card className="rounded-2xl border-none shadow-sm">
                            <CardContent className="py-12 text-center text-muted-foreground">ไม่มีคำถามปลายเปิด</CardContent>
                        </Card>
                    ) : (
                        openStats.map(({ question, answers }) => (
                            <Card key={question.id} className="rounded-2xl border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        {question.label}
                                        <Badge variant="outline" className="text-xs ml-auto">{answers.length} คำตอบ</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {answers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">ไม่มีคำตอบ</p>
                                    ) : (
                                        answers.map((a, i) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                                                <p className="text-xs text-muted-foreground mb-1">{a.name}</p>
                                                <p className="text-sm leading-relaxed">{a.answer}</p>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
