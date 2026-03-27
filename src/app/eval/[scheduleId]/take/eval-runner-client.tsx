'use client';

import React, { useState, useMemo } from 'react';
import type { EvaluationTemplate } from '@/lib/course-data';
import { EmojiFace } from '@/components/eval/emoji-face';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitEvaluation } from './eval-actions';
import { getScoreColor } from '@/lib/evaluation-utils';
import { ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Score button colors (red → amber → green) ─────────────────────────────────

const SCORE_HEX = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#84cc16', '#22c55e', '#22c55e', '#10b981', '#059669',
];

function ScoreButton({ value, selected, onSelect }: {
    value: number;
    selected: boolean;
    onSelect: (v: number) => void;
}) {
    const hex = SCORE_HEX[value - 1];
    const isDarkText = value >= 5 && value <= 6;
    return (
        <button
            type="button"
            onClick={() => onSelect(value)}
            className="flex-1 rounded-xl font-black text-xs select-none transition-all duration-150 relative"
            style={{
                height: 40,
                backgroundColor: selected ? hex : `${hex}28`,
                color: selected ? (isDarkText ? '#1e293b' : 'white') : hex,
                transform: selected ? 'translateY(-3px) scale(1.08)' : 'scale(1)',
                boxShadow: selected ? `0 6px 16px ${hex}55` : 'none',
                fontWeight: 900,
                zIndex: selected ? 1 : 0,
            }}
        >
            {value}
        </button>
    );
}

// ── Rating item card ──────────────────────────────────────────────────────────

function RatingItem({ label, score, onChange }: {
    label: string;
    score: number | undefined;
    onChange: (v: number) => void;
}) {
    const hasScore = score !== undefined;
    const scoreColor = hasScore ? getScoreColor(score!) : '#94a3b8';

    return (
        <div
            className="rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
            style={{
                border: `2px solid ${hasScore ? scoreColor + '55' : '#e2e8f0'}`,
                backgroundColor: hasScore ? `${scoreColor}08` : 'white',
            }}
        >
            {/* Label + emoji row */}
            <div className="px-3 pt-3 pb-2 flex items-start gap-3">
                <div className="shrink-0">
                    <EmojiFace score={hasScore ? score! : 5} size={44} />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium leading-snug text-slate-700 dark:text-slate-200">{label}</p>
                    {hasScore && (
                        <span
                            className="shrink-0 text-2xl font-black tabular-nums leading-none"
                            style={{ color: scoreColor }}
                        >
                            {score}
                        </span>
                    )}
                </div>
            </div>

            {/* Score buttons — full width flex row */}
            <div className="px-3 pb-3">
                <div className="flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
                        <ScoreButton key={v} value={v} selected={score === v} onSelect={onChange} />
                    ))}
                </div>
                <div className="flex justify-between mt-1 px-0.5">
                    <span className="text-[10px] text-slate-400">น้อยที่สุด</span>
                    <span className="text-[10px] text-slate-400">มากที่สุด</span>
                </div>
            </div>
        </div>
    );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                        width: i === current ? 20 : 6,
                        height: 6,
                        backgroundColor: i < current ? '#7c3aed' : i === current ? '#8b5cf6' : '#ddd6fe',
                    }}
                />
            ))}
        </div>
    );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = { kind: 'section'; index: number } | { kind: 'open' } | { kind: 'submitted'; averageScore: number };

// ── Main Component ────────────────────────────────────────────────────────────

export function EvalRunnerClient({
    template, scheduleId, courseId,
}: {
    template: EvaluationTemplate;
    scheduleId: string;
    courseId: string;
}) {
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
    const [phase, setPhase] = useState<Phase>({ kind: 'section', index: 0 });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const totalPhases = template.sections.length + (template.openQuestions.length > 0 ? 1 : 0);
    const currentPhaseIndex = phase.kind === 'section' ? phase.index
        : phase.kind === 'open' ? template.sections.length
        : totalPhases;

    const setRating = (itemId: string, v: number) =>
        setRatings(prev => ({ ...prev, [itemId]: v }));

    const setOpen = (qId: string, v: string) =>
        setOpenAnswers(prev => ({ ...prev, [qId]: v }));

    // Section-level avg for the emoji in the header
    const sectionAvgScore = useMemo(() => {
        if (phase.kind !== 'section') return 5;
        const sec = template.sections[phase.index];
        const vals = sec.items.map(i => ratings[i.id]).filter((v): v is number => v !== undefined);
        if (vals.length === 0) return 5;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }, [phase, template, ratings]);

    // ── Section phase ──────────────────────────────────────────────────────────
    if (phase.kind === 'section') {
        const section = template.sections[phase.index];
        const allRated = section.items.every(item => ratings[item.id] !== undefined);
        const isLast = phase.index === template.sections.length - 1;

        const goNext = () => {
            if (!allRated) return;
            if (isLast && template.openQuestions.length === 0) {
                handleSubmit();
            } else if (isLast) {
                setPhase({ kind: 'open' });
            } else {
                setPhase({ kind: 'section', index: phase.index + 1 });
            }
        };

        const goBack = () => {
            if (phase.index > 0) setPhase({ kind: 'section', index: phase.index - 1 });
        };

        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

                {/* Sticky top bar */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100/80 dark:border-slate-800/80 px-4 py-3">
                    <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                        <ProgressDots total={totalPhases} current={currentPhaseIndex} />
                        <span className="text-xs text-muted-foreground font-medium shrink-0">
                            {phase.index + 1} / {template.sections.length}
                        </span>
                    </div>
                </div>

                {/* Section header card */}
                <div className="px-4 pt-5 pb-3 max-w-lg mx-auto w-full">
                    <div className="bg-gradient-to-br from-violet-600 to-violet-500 rounded-3xl p-5 shadow-xl shadow-violet-500/25 relative overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
                        <div className="flex items-start justify-between gap-3 relative z-10">
                            <div className="text-white flex-1">
                                <p className="text-xs font-medium opacity-70 mb-1">
                                    หมวดที่ {phase.index + 1}
                                </p>
                                <h2 className="text-lg font-bold leading-tight">{section.title}</h2>
                                <p className="text-xs opacity-60 mt-1.5">
                                    ให้คะแนน 1–10 ทุกหัวข้อ
                                </p>
                            </div>
                            <div className="shrink-0">
                                <EmojiFace score={sectionAvgScore} size={68} priority />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="flex-1 px-4 pb-4 max-w-lg mx-auto w-full space-y-3">
                    {section.items.map(item => (
                        <RatingItem
                            key={item.id}
                            label={item.label}
                            score={ratings[item.id]}
                            onChange={v => setRating(item.id, v)}
                        />
                    ))}
                </div>

                {/* Bottom nav */}
                <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100/80 dark:border-slate-800/80 p-4">
                    <div className="max-w-lg mx-auto flex gap-2">
                        {phase.index > 0 && (
                            <Button
                                variant="outline"
                                onClick={goBack}
                                className="h-12 w-12 rounded-2xl p-0 border-slate-200 dark:border-slate-700 shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <button
                            type="button"
                            disabled={!allRated || submitting}
                            onClick={goNext}
                            className={cn(
                                'flex-1 h-12 rounded-2xl font-bold text-base gap-2 flex items-center justify-center transition-all duration-300',
                                allRated && !submitting
                                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30 hover:-translate-y-0.5'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            )}
                        >
                            {submitting ? (
                                <span className="animate-pulse">กำลังส่ง...</span>
                            ) : isLast && template.openQuestions.length === 0 ? (
                                <>ส่งแบบประเมิน <Send className="w-4 h-4 ml-1" /></>
                            ) : (
                                <>ถัดไป <ChevronRight className="w-5 h-5 ml-1" /></>
                            )}
                        </button>
                    </div>
                    {!allRated && (
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            ยังให้คะแนนไม่ครบ {section.items.filter(i => ratings[i.id] === undefined).length} หัวข้อ
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ── Open questions phase ───────────────────────────────────────────────────
    if (phase.kind === 'open') {
        const requiredAnswered = template.openQuestions
            .filter(q => q.required)
            .every(q => (openAnswers[q.id] ?? '').trim().length > 0);

        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

                <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100/80 dark:border-slate-800/80 px-4 py-3">
                    <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                        <ProgressDots total={totalPhases} current={currentPhaseIndex} />
                        <span className="text-xs text-muted-foreground font-medium shrink-0">คำถามเพิ่มเติม</span>
                    </div>
                </div>

                {/* Header */}
                <div className="px-4 pt-5 pb-3 max-w-lg mx-auto w-full">
                    <div className="bg-gradient-to-br from-violet-600 to-violet-500 rounded-3xl p-5 shadow-xl shadow-violet-500/25 relative overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
                        <div className="flex items-start justify-between gap-3 relative z-10">
                            <div className="text-white">
                                <p className="text-xs font-medium opacity-70 mb-1">ขั้นตอนสุดท้าย</p>
                                <h2 className="text-lg font-bold">ความคิดเห็นเพิ่มเติม</h2>
                                <p className="text-xs opacity-60 mt-1.5">แชร์ความคิดเห็นของคุณได้เลย</p>
                            </div>
                            <div className="shrink-0">
                                <EmojiFace score={8} size={68} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 pb-4 max-w-lg mx-auto w-full space-y-4">
                    {template.openQuestions.map((q, i) => (
                        <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                            <label className="text-sm font-semibold leading-snug flex gap-1">
                                {i + 1}. {q.label}
                                {q.required && <span className="text-rose-500">*</span>}
                            </label>
                            <Textarea
                                className="rounded-xl min-h-[90px] resize-none text-sm border-slate-200 dark:border-slate-700 focus:border-violet-400 focus:ring-violet-400/20"
                                placeholder="พิมพ์คำตอบของคุณที่นี่..."
                                value={openAnswers[q.id] ?? ''}
                                onChange={e => setOpen(q.id, e.target.value)}
                            />
                            {q.required && !openAnswers[q.id]?.trim() && (
                                <p className="text-xs text-rose-500">* จำเป็นต้องตอบ</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100/80 dark:border-slate-800/80 p-4">
                    <div className="max-w-lg mx-auto flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPhase({ kind: 'section', index: template.sections.length - 1 })}
                            className="h-12 w-12 rounded-2xl p-0 border-slate-200 dark:border-slate-700 shrink-0"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <button
                            type="button"
                            disabled={!requiredAnswered || submitting}
                            onClick={handleSubmit}
                            className={cn(
                                'flex-1 h-12 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300',
                                requiredAnswered && !submitting
                                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30 hover:-translate-y-0.5'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            )}
                        >
                            {submitting ? (
                                <span className="animate-pulse">กำลังส่ง...</span>
                            ) : (
                                <>ส่งแบบประเมิน <Send className="w-4 h-4 ml-1" /></>
                            )}
                        </button>
                    </div>
                    {error && <p className="text-center text-xs text-rose-500 mt-2">{error}</p>}
                </div>
            </div>
        );
    }

    // ── Submitted result screen ────────────────────────────────────────────────
    const avg = phase.averageScore;
    const scoreColor = getScoreColor(Math.round(avg));

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="max-w-sm w-full space-y-5 text-center">

                {/* Big emoji */}
                <div className="flex justify-center">
                    <div className="animate-[bounceIn_0.6s_cubic-bezier(.34,1.56,.64,1)_both]">
                        <EmojiFace score={Math.round(avg)} size={120} />
                    </div>
                </div>

                {/* Thank you */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight">ขอบคุณมากๆ!</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        ความคิดเห็นของคุณมีคุณค่าต่อการพัฒนาหลักสูตร
                    </p>
                </div>

                {/* Score card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 space-y-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">คะแนนเฉลี่ยของคุณ</p>
                    <div className="flex items-baseline justify-center gap-1">
                        <span
                            className="text-6xl font-black tabular-nums transition-all"
                            style={{ color: scoreColor }}
                        >
                            {avg.toFixed(1)}
                        </span>
                        <span className="text-2xl text-slate-400 font-medium">/10</span>
                    </div>

                    {/* Section breakdown */}
                    {template.sections.length > 1 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {template.sections.map(sec => {
                                const vals = sec.items.map(i => ratings[i.id]).filter((v): v is number => v !== undefined);
                                const sAvg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                                return (
                                    <div key={sec.id} className="flex items-center gap-2">
                                        <EmojiFace score={Math.round(sAvg) || 5} size={22} />
                                        <p className="text-xs text-muted-foreground flex-1 text-left truncate">{sec.title}</p>
                                        <span className="text-xs font-bold tabular-nums" style={{ color: getScoreColor(Math.round(sAvg)) }}>
                                            {sAvg.toFixed(1)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <a
                    href={`/eval/${scheduleId}`}
                    className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium hover:underline"
                >
                    ← กลับหน้าหลัก
                </a>
            </div>
        </div>
    );

    // ── Submit handler ─────────────────────────────────────────────────────────
    async function handleSubmit() {
        setSubmitting(true);
        setError('');
        const result = await submitEvaluation(template, scheduleId, courseId, ratings, openAnswers);
        if (result.success) {
            const allVals = Object.values(ratings);
            const avg = allVals.length > 0
                ? Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 100) / 100
                : 0;
            setPhase({ kind: 'submitted', averageScore: avg });
        } else {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
        setSubmitting(false);
    }
}
