'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TrainingSchedule, ExamTemplate, ExamSession, TrainingRecord } from '@/lib/course-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Users, CheckCircle2, XCircle, BarChart2, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

function formatDate(d: string) {
    try { return format(new Date(d), 'd MMM yyyy', { locale: th }); } catch { return d; }
}

function ScoreBadge({ score, passing }: { score: number | null; passing?: number }) {
    if (score === null) return <Badge variant="secondary" className="text-xs">ไม่ได้ทำ</Badge>;
    const passed = passing !== undefined ? score >= passing : null;
    return (
        <span className={`font-bold ${passed === true ? 'text-emerald-600' : passed === false ? 'text-red-500' : 'text-foreground'}`}>
            {score}%
        </span>
    );
}

// ─── Tab 1: Class Overview ─────────────────────────────────────────────────────

function ClassOverviewTab({
    records, sessions, template
}: {
    records: TrainingRecord[];
    sessions: ExamSession[];
    template: ExamTemplate | null;
}) {
    const sessionByRecordAndType = useMemo(() => {
        const map = new Map<string, ExamSession>();
        sessions.forEach(s => map.set(`${s.trainingRecordId}_${s.examType}`, s));
        return map;
    }, [sessions]);

    const rows = useMemo(() => records.map(r => {
        const pre = sessionByRecordAndType.get(`${r.id}_pretest`) ?? null;
        const post = sessionByRecordAndType.get(`${r.id}_posttest`) ?? null;
        return { record: r, pre, post };
    }), [records, sessionByRecordAndType]);

    const pretestSessions = sessions.filter(s => s.examType === 'pretest');
    const posttestSessions = sessions.filter(s => s.examType === 'posttest');

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    const avgPre = avg(pretestSessions.map(s => s.scorePercent));
    const avgPost = avg(posttestSessions.map(s => s.scorePercent));
    const passingScore = template?.posttest?.passingScore;
    const passCount = passingScore !== undefined
        ? posttestSessions.filter(s => s.scorePercent >= passingScore).length
        : null;
    const passRate = passCount !== null && posttestSessions.length > 0
        ? Math.round((passCount / posttestSessions.length) * 100)
        : null;

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">ผู้เข้าอบรม</p>
                        <p className="text-2xl font-bold">{records.length}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">คะแนนเฉลี่ย Pre-test</p>
                        <p className="text-2xl font-bold">{avgPre !== null ? `${avgPre}%` : '–'}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">คะแนนเฉลี่ย Post-test</p>
                        <p className="text-2xl font-bold">{avgPost !== null ? `${avgPost}%` : '–'}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">อัตราผ่าน</p>
                        <p className="text-2xl font-bold text-emerald-600">{passRate !== null ? `${passRate}%` : '–'}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ที่นั่ง</TableHead>
                                <TableHead>ชื่อ-นามสกุล</TableHead>
                                <TableHead>Pre-test</TableHead>
                                <TableHead>Post-test</TableHead>
                                <TableHead>พัฒนาการ</TableHead>
                                <TableHead>ผล</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(({ record, pre, post }) => {
                                const delta = pre && post ? post.scorePercent - pre.scorePercent : null;
                                const passed = passingScore !== undefined && post
                                    ? post.scorePercent >= passingScore
                                    : null;
                                return (
                                    <TableRow key={record.id}>
                                        <TableCell className="text-muted-foreground text-sm">{record.seatNumber ?? '–'}</TableCell>
                                        <TableCell className="font-medium">{record.attendeeName}</TableCell>
                                        <TableCell>
                                            <ScoreBadge score={pre?.scorePercent ?? null} passing={template?.pretest?.passingScore} />
                                        </TableCell>
                                        <TableCell>
                                            <ScoreBadge score={post?.scorePercent ?? null} passing={passingScore} />
                                        </TableCell>
                                        <TableCell>
                                            {delta !== null ? (
                                                <span className={`flex items-center gap-1 text-sm font-medium ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                    {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : delta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                                    {delta > 0 ? '+' : ''}{delta}%
                                                </span>
                                            ) : '–'}
                                        </TableCell>
                                        <TableCell>
                                            {passed === true && <Badge className="text-xs bg-emerald-500 text-white">ผ่าน</Badge>}
                                            {passed === false && <Badge variant="destructive" className="text-xs">ไม่ผ่าน</Badge>}
                                            {passed === null && <span className="text-muted-foreground text-xs">–</span>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Tab 2: Question Analysis ──────────────────────────────────────────────────

function QuestionAnalysisTab({
    sessions, template
}: {
    sessions: ExamSession[];
    template: ExamTemplate | null;
}) {
    const [examType, setExamType] = useState<'pretest' | 'posttest'>('posttest');

    const config = examType === 'pretest' ? template?.pretest : template?.posttest;
    const relevantSessions = sessions.filter(s => s.examType === examType);

    const questionStats = useMemo(() => {
        if (!config) return [];
        return config.questions.map(q => {
            const total = relevantSessions.length;
            const wrong = relevantSessions.filter(s =>
                s.answers.some(a => a.questionId === q.id && !a.isCorrect)
            ).length;
            const skipped = relevantSessions.filter(s =>
                s.answers.some(a => a.questionId === q.id && a.selectedOptionId === null)
            ).length;
            const wrongPct = total > 0 ? Math.round((wrong / total) * 100) : 0;
            return { q, total, wrong, skipped, wrongPct };
        }).sort((a, b) => b.wrongPct - a.wrongPct);
    }, [config, relevantSessions]);

    // Chart data for score distribution (buckets of 10%)
    const distributionData = useMemo(() => {
        const buckets: { range: string; count: number }[] = [];
        for (let i = 0; i < 10; i++) {
            const min = i * 10;
            const max = min + 10;
            const count = relevantSessions.filter(s => s.scorePercent >= min && s.scorePercent < max).length;
            buckets.push({ range: `${min}-${max}%`, count });
        }
        const perfect = relevantSessions.filter(s => s.scorePercent === 100).length;
        if (perfect > 0) buckets[buckets.length - 1].count += perfect;
        return buckets;
    }, [relevantSessions]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Select value={examType} onValueChange={v => setExamType(v as 'pretest' | 'posttest')}>
                    <SelectTrigger className="rounded-xl w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {template?.pretest && <SelectItem value="pretest">Pre-test</SelectItem>}
                        {template?.posttest && <SelectItem value="posttest">Post-test</SelectItem>}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{relevantSessions.length} คน ทำแบบทดสอบ</span>
            </div>

            {/* Score distribution chart */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">การกระจายคะแนน</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={distributionData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" name="จำนวนคน" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Question wrong-answer rate */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">อัตราตอบผิดรายข้อ (เรียงจากมากไปน้อย)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {questionStats.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">ยังไม่มีข้อมูล</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>คำถาม</TableHead>
                                    <TableHead className="text-right">ตอบผิด</TableHead>
                                    <TableHead className="text-right">%ผิด</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questionStats.map(({ q, wrong, total, wrongPct }, i) => (
                                    <TableRow key={q.id}>
                                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                                        <TableCell className="text-sm max-w-xs truncate">{q.text || '(ไม่มีข้อความ)'}</TableCell>
                                        <TableCell className="text-right text-sm">{wrong}/{total}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={`font-bold text-sm ${wrongPct >= 70 ? 'text-red-500' : wrongPct >= 40 ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                {wrongPct}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Tab 3: Individual ────────────────────────────────────────────────────────

function IndividualTab({
    records, sessions, template
}: {
    records: TrainingRecord[];
    sessions: ExamSession[];
    template: ExamTemplate | null;
}) {
    const [selectedRecordId, setSelectedRecordId] = useState<string>('');

    const sessionsByRecord = useMemo(() => {
        const map = new Map<string, ExamSession[]>();
        sessions.forEach(s => {
            const arr = map.get(s.trainingRecordId) ?? [];
            arr.push(s);
            map.set(s.trainingRecordId, arr);
        });
        return map;
    }, [sessions]);

    const selectedRecord = records.find(r => r.id === selectedRecordId);
    const selectedSessions = selectedRecordId ? (sessionsByRecord.get(selectedRecordId) ?? []) : [];

    function renderSessionDetail(session: ExamSession) {
        const config = session.examType === 'pretest' ? template?.pretest : template?.posttest;
        const questionMap = new Map(config?.questions.map(q => [q.id, q]) ?? []);
        const additionalSections = config?.additionalSections ?? [];

        return (
            <div className="space-y-4">
                {/* Score summary */}
                <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
                    <div>
                        <p className="text-xs text-muted-foreground">คะแนน</p>
                        <p className="text-2xl font-bold">{session.rawScore}/{session.totalPoints}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">เปอร์เซ็นต์</p>
                        <p className="text-2xl font-bold">{session.scorePercent}%</p>
                    </div>
                    {session.passed !== null && (
                        <div>
                            {session.passed
                                ? <Badge className="bg-emerald-500 text-white">ผ่าน</Badge>
                                : <Badge variant="destructive">ไม่ผ่าน</Badge>
                            }
                        </div>
                    )}
                    {session.timeTakenSeconds && (
                        <div>
                            <p className="text-xs text-muted-foreground">เวลาที่ใช้</p>
                            <p className="text-sm font-medium">{Math.floor(session.timeTakenSeconds / 60)} นาที {session.timeTakenSeconds % 60} วินาที</p>
                        </div>
                    )}
                </div>

                {/* Additional responses (before exam) */}
                {session.additionalResponses && session.additionalResponses.length > 0 && (() => {
                    const beforeSections = additionalSections.filter(s => s.placement === 'before');
                    return beforeSections.map(sec => {
                        const resp = session.additionalResponses!.find(r => r.sectionId === sec.id);
                        if (!resp) return null;
                        return (
                            <div key={sec.id} className="space-y-2">
                                <p className="text-sm font-semibold">{sec.title}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {sec.fields.map(f => (
                                        <div key={f.id} className="p-2 bg-muted/40 rounded-lg">
                                            <p className="text-xs text-muted-foreground">{f.label}</p>
                                            <p className="text-sm font-medium">{resp.responses[f.id] ?? '–'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    });
                })()}

                {/* Answers */}
                <div className="space-y-2">
                    <p className="text-sm font-semibold">รายละเอียดคำตอบ</p>
                    {session.answers.map((ans, i) => {
                        const q = questionMap.get(ans.questionId);
                        if (!q) return null;
                        const selectedOpt = q.options.find(o => o.id === ans.selectedOptionId);
                        const correctOpt = q.options.find(o => o.id === q.correctOptionId);
                        return (
                            <div key={ans.questionId} className={`p-3 rounded-xl border ${ans.isCorrect ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'}`}>
                                <div className="flex items-start gap-2">
                                    {ans.isCorrect
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    }
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{i + 1}. {q.text}</p>
                                        <p className="text-xs mt-1">
                                            <span className="text-muted-foreground">ตอบ: </span>
                                            <span className={ans.isCorrect ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                                                {selectedOpt ? `${selectedOpt.label} ${selectedOpt.text}` : '(ไม่ได้ตอบ)'}
                                            </span>
                                        </p>
                                        {!ans.isCorrect && (
                                            <p className="text-xs text-emerald-700">
                                                <span className="text-muted-foreground">เฉลย: </span>
                                                {correctOpt ? `${correctOpt.label} ${correctOpt.text}` : '–'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Additional responses (after exam) */}
                {session.additionalResponses && session.additionalResponses.length > 0 && (() => {
                    const afterSections = additionalSections.filter(s => s.placement === 'after');
                    return afterSections.map(sec => {
                        const resp = session.additionalResponses!.find(r => r.sectionId === sec.id);
                        if (!resp) return null;
                        return (
                            <div key={sec.id} className="space-y-2">
                                <p className="text-sm font-semibold">{sec.title}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {sec.fields.map(f => (
                                        <div key={f.id} className="p-2 bg-muted/40 rounded-lg">
                                            <p className="text-xs text-muted-foreground">{f.label}</p>
                                            <p className="text-sm font-medium">{resp.responses[f.id] ?? '–'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
                <SelectTrigger className="rounded-xl max-w-sm">
                    <SelectValue placeholder="เลือกผู้อบรม..." />
                </SelectTrigger>
                <SelectContent>
                    {records.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                            {r.seatNumber ? `${r.seatNumber}. ` : ''}{r.attendeeName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {selectedRecord && (
                <div className="space-y-4">
                    {selectedSessions.length === 0 ? (
                        <Card className="rounded-2xl border-none shadow-sm">
                            <CardContent className="py-8 text-center text-muted-foreground text-sm">
                                ผู้อบรมคนนี้ยังไม่ได้ทำแบบทดสอบ
                            </CardContent>
                        </Card>
                    ) : (
                        selectedSessions
                            .sort((a, b) => a.examType === 'pretest' ? -1 : 1)
                            .map(session => (
                                <Card key={session.id} className="rounded-2xl border-none shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">
                                            {session.examType === 'pretest' ? 'ผล Pre-test' : 'ผล Post-test'}
                                            <span className="text-xs text-muted-foreground ml-2 font-normal">
                                                {formatDate(session.submittedAt)}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {renderSessionDetail(session)}
                                    </CardContent>
                                </Card>
                            ))
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ExamResultsClientPage({
    schedule, sessions, records, template
}: {
    schedule: TrainingSchedule;
    sessions: ExamSession[];
    records: TrainingRecord[];
    template: ExamTemplate | null;
}) {
    function formatDateRange(start: string, end: string) {
        try {
            const s = new Date(start);
            const e = new Date(end);
            if (s.toDateString() === e.toDateString()) return format(s, 'd MMMM yyyy', { locale: th });
            return `${format(s, 'd')}–${format(e, 'd MMMM yyyy', { locale: th })}`;
        } catch { return start; }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/erp/exam-results"><ArrowLeft className="w-5 h-5" /></Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold font-headline">{schedule.courseTitle}</h1>
                    <p className="text-sm text-muted-foreground">
                        {formatDateRange(schedule.startDate, schedule.endDate)} · {schedule.location}
                    </p>
                </div>
            </div>

            {!template ? (
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                        <BookOpen className="w-10 h-10 opacity-30" />
                        <p>หลักสูตรนี้ไม่มีแบบทดสอบ</p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="overview">
                    <TabsList className="rounded-xl mb-4">
                        <TabsTrigger value="overview" className="rounded-lg">ภาพรวมชั้นเรียน</TabsTrigger>
                        <TabsTrigger value="analysis" className="rounded-lg">วิเคราะห์ข้อสอบ</TabsTrigger>
                        <TabsTrigger value="individual" className="rounded-lg">รายบุคคล</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <ClassOverviewTab records={records} sessions={sessions} template={template} />
                    </TabsContent>
                    <TabsContent value="analysis">
                        <QuestionAnalysisTab sessions={sessions} template={template} />
                    </TabsContent>
                    <TabsContent value="individual">
                        <IndividualTab records={records} sessions={sessions} template={template} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
