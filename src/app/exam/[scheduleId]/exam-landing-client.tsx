'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TrainingSchedule, ExamTemplate, TrainingRecord, ExamSession } from '@/lib/course-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, ArrowRight, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

function formatDateRange(start: string, end: string) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (s.toDateString() === e.toDateString()) return format(s, 'd MMMM yyyy', { locale: th });
        return `${format(s, 'd')}–${format(e, 'd MMMM yyyy', { locale: th })}`;
    } catch { return start; }
}

export function ExamLandingClient({
    schedule, template, records, sessions, focusType
}: {
    schedule: TrainingSchedule;
    template: ExamTemplate;
    records: TrainingRecord[];
    sessions: ExamSession[];
    focusType?: 'pretest' | 'posttest';
}) {
    const [selectedRecordId, setSelectedRecordId] = useState('');

    const sessionsByRecord = useMemo(() => {
        const map = new Map<string, Map<string, ExamSession>>();
        sessions.forEach(s => {
            if (!map.has(s.trainingRecordId)) map.set(s.trainingRecordId, new Map());
            map.get(s.trainingRecordId)!.set(s.examType, s);
        });
        return map;
    }, [sessions]);

    const selectedRecord = records.find(r => r.id === selectedRecordId);
    const mySessionMap = selectedRecordId ? (sessionsByRecord.get(selectedRecordId) ?? new Map<string, ExamSession>()) : new Map<string, ExamSession>();

    // When focusType is set (via QR code), only show that exam type
    const showPretest = (template.examMode === 'pretest_only' || template.examMode === 'both') && (!focusType || focusType === 'pretest');
    const showPosttest = (template.examMode === 'posttest_only' || template.examMode === 'both') && (!focusType || focusType === 'posttest');

    const activeRecords = useMemo(() =>
        records
            .filter(r => r.status !== 'failed')
            .sort((a, b) => {
                const sA = a.seatNumber ? parseInt(a.seatNumber, 10) : Infinity;
                const sB = b.seatNumber ? parseInt(b.seatNumber, 10) : Infinity;
                if (sA !== sB) return sA - sB;
                return a.attendeeName.localeCompare(b.attendeeName, 'th');
            }),
        [records]
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-lg w-full space-y-4">
                {/* Header card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-6 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">NET Safety Platform</span>
                    </div>
                    <h1 className="text-xl font-bold leading-tight">{schedule.courseTitle}</h1>
                    <p className="text-sm text-muted-foreground">
                        {formatDateRange(schedule.startDate, schedule.endDate)} · {schedule.location}
                    </p>
                    <p className="text-sm text-muted-foreground">วิทยากร: {schedule.instructorTitle} {schedule.instructorName}</p>
                </div>

                {/* Name selector */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">เลือกชื่อของคุณ</label>
                        <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
                            <SelectTrigger className="rounded-2xl h-12 text-base">
                                <SelectValue placeholder="เลือกชื่อ-นามสกุล..." />
                            </SelectTrigger>
                            <SelectContent>
                                {activeRecords.length === 0 ? (
                                    <SelectItem value="__none" disabled>ไม่มีรายชื่อในรอบนี้</SelectItem>
                                ) : (
                                    activeRecords.map((r, i) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {i + 1}. {r.attendeeName}{r.companyName && ` (${r.companyName})`}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedRecord && (
                        <div className="space-y-3 pt-2">
                            <p className="text-sm text-muted-foreground">เลือกแบบทดสอบที่ต้องการทำ:</p>

                            {showPretest && (() => {
                                const done = mySessionMap.get('pretest');
                                return (
                                    <ExamOptionCard
                                        title={template.pretest?.title ?? 'แบบทดสอบก่อนการอบรม'}
                                        type="pretest"
                                        config={template.pretest}
                                        session={done ?? null}
                                        href={`/exam/${schedule.id}/take?type=pretest&recordId=${selectedRecord.id}`}
                                        highlighted={focusType === 'pretest'}
                                    />
                                );
                            })()}

                            {showPosttest && (() => {
                                const done = mySessionMap.get('posttest');
                                return (
                                    <ExamOptionCard
                                        title={template.posttest?.title ?? 'แบบทดสอบหลังการอบรม'}
                                        type="posttest"
                                        config={template.posttest}
                                        session={done ?? null}
                                        href={`/exam/${schedule.id}/take?type=posttest&recordId=${selectedRecord.id}`}
                                        highlighted={focusType === 'posttest'}
                                    />
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ExamOptionCard({
    title, type, config, session, href, highlighted = false
}: {
    title: string;
    type: 'pretest' | 'posttest';
    config: { timeLimitMinutes?: number; questions: any[]; passingScore?: number } | undefined;
    session: ExamSession | null;
    href: string;
    highlighted?: boolean;
}) {
    if (!config) return null;

    if (session) {
        return (
            <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                        <p className="font-medium text-sm">{title}</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            ทำแล้ว · คะแนน {session.scorePercent}%
                            {session.passed !== null && (session.passed ? ' · ผ่าน' : ' · ไม่ผ่าน')}
                        </p>
                    </div>
                </div>
                <Badge className="bg-emerald-500 text-white text-xs">ทำแล้ว</Badge>
            </div>
        );
    }

    return (
        <Link href={href} className="block">
            <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors cursor-pointer ${highlighted ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md shadow-blue-500/10' : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                        <span className="text-white text-xs font-bold">{config.questions.length}</span>
                    </div>
                    <div>
                        <p className="font-medium text-sm">{title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{config.questions.length} ข้อ</span>
                            {config.timeLimitMinutes && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{config.timeLimitMinutes} นาที
                                    </span>
                                </>
                            )}
                            {config.passingScore && (
                                <>
                                    <span>·</span>
                                    <span>ผ่าน {config.passingScore}%</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
        </Link>
    );
}
