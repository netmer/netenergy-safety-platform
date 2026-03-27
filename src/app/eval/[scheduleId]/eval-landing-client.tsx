'use client';

import React from 'react';
import Link from 'next/link';
import type { TrainingSchedule, EvaluationTemplate } from '@/lib/course-data';
import { Button } from '@/components/ui/button';
import { ArrowRight, ClipboardCheck, MapPin, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { EmojiFace } from '@/components/eval/emoji-face';

function formatDateRange(start: string, end: string) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (s.toDateString() === e.toDateString()) return format(s, 'd MMMM yyyy', { locale: th });
        return `${format(s, 'd')}–${format(e, 'd MMMM yyyy', { locale: th })}`;
    } catch { return start; }
}

export function EvalLandingClient({
    schedule, template,
}: {
    schedule: TrainingSchedule;
    template: EvaluationTemplate;
}) {
    const totalItems = template.sections.reduce((s, sec) => s + sec.items.length, 0);
    const dateStr = formatDateRange(schedule.startDate, schedule.endDate);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="max-w-sm w-full space-y-4">

                {/* Main card */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden">
                    {/* Gradient header */}
                    <div className="bg-gradient-to-br from-violet-600 to-violet-500 px-6 pt-7 pb-8 relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
                        <div className="absolute -bottom-8 -left-4 w-20 h-20 bg-white/10 rounded-full" />

                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
                                <ClipboardCheck className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-white leading-tight">{schedule.courseTitle}</h1>
                            <div className="mt-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-white/75 text-xs">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    <span>{dateStr}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/75 text-xs">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span>{schedule.location}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/75 text-xs">
                                    <User className="w-3.5 h-3.5 shrink-0" />
                                    <span>วิทยากร: {schedule.instructorTitle} {schedule.instructorName}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6 space-y-5">
                        {/* Template info */}
                        <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-100 dark:border-violet-900">
                            <div className="shrink-0">
                                <EmojiFace score={8} size={44} priority />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">{template.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {template.sections.length} หมวด · {totalItems} หัวข้อ
                                    {template.openQuestions.length > 0 && ` · ${template.openQuestions.length} คำถามปลายเปิด`}
                                </p>
                            </div>
                        </div>

                        {/* CTA */}
                        <Link href={`/eval/${schedule.id}/take`}>
                            <Button className="w-full h-13 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-base gap-2 shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:-translate-y-0.5">
                                เริ่มประเมิน
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>

                        <p className="text-center text-xs text-muted-foreground">
                            ไม่ต้องระบุชื่อ · ใช้เวลาไม่เกิน 5 นาที
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-muted-foreground/60">NET Safety Platform</p>
            </div>
        </div>
    );
}
