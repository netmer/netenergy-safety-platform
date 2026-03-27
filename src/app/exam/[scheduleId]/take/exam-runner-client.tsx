'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import type { TrainingRecord, ExamTemplate, ExamConfig, ExamQuestion, AdditionalSectionField, AdditionalSectionResponse } from '@/lib/course-data';
import { submitExamSession } from './exam-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock, ArrowRight, Send, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = 'additional_before' | 'questions' | 'additional_after' | 'submitted';

// ─── Additional Section Form ──────────────────────────────────────────────────

function AdditionalSectionForm({
    section,
    values,
    onChange,
}: {
    section: { id: string; title: string; fields: AdditionalSectionField[] };
    values: Record<string, string>;
    onChange: (fieldId: string, value: string) => void;
}) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold">{section.title}</h2>
            {section.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                    <Label className="text-sm">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'text' || field.type === 'number' ? (
                        <Input
                            type={field.type}
                            value={values[field.id] ?? ''}
                            onChange={e => onChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="rounded-xl"
                        />
                    ) : field.type === 'textarea' ? (
                        <Textarea
                            value={values[field.id] ?? ''}
                            onChange={e => onChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className="rounded-xl resize-none"
                        />
                    ) : field.type === 'select' ? (
                        <Select value={values[field.id] ?? ''} onValueChange={v => onChange(field.id, v)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="เลือก..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(field.options ?? []).map(opt => (
                                    <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : field.type === 'radio' ? (
                        <RadioGroup
                            value={values[field.id] ?? ''}
                            onValueChange={v => onChange(field.id, v)}
                            className="space-y-2"
                        >
                            {(field.options ?? []).map(opt => (
                                <div key={opt.id} className="flex items-center gap-2">
                                    <RadioGroupItem value={opt.value} id={`${field.id}_${opt.id}`} />
                                    <Label htmlFor={`${field.id}_${opt.id}`} className="font-normal cursor-pointer">
                                        {opt.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function Timer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
    const [remaining, setRemaining] = useState(totalSeconds);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    useEffect(() => {
        if (remaining <= 0) {
            onExpireRef.current();
            return;
        }
        const id = setTimeout(() => setRemaining(r => r - 1), 1000);
        return () => clearTimeout(id);
    }, [remaining]);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const urgent = remaining <= 60;

    return (
        <div className={cn('flex items-center gap-1.5 text-sm font-bold', urgent ? 'text-red-500 animate-pulse' : 'text-muted-foreground')}>
            <Clock className="w-4 h-4" />
            {mins}:{secs.toString().padStart(2, '0')}
        </div>
    );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
    scorePercent, rawScore, totalPoints, passed, examType, scheduleId
}: {
    scorePercent: number; rawScore: number; totalPoints: number;
    passed: boolean | null; examType: string; scheduleId: string;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-8 text-center space-y-5">
                <div className="text-5xl">
                    {passed === true ? '🎉' : passed === false ? '📚' : '✅'}
                </div>
                <div>
                    <p className="text-sm text-muted-foreground mb-1">ส่งคำตอบแล้ว</p>
                    <h1 className="text-4xl font-bold text-blue-600">{scorePercent}%</h1>
                    <p className="text-muted-foreground text-sm mt-1">{rawScore} / {totalPoints} คะแนน</p>
                </div>
                {passed !== null && (
                    <Badge
                        className={cn('text-base px-4 py-1', passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}
                    >
                        {passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </Badge>
                )}
                <p className="text-sm text-muted-foreground">
                    {examType === 'pretest' ? 'แบบทดสอบก่อนการอบรม' : 'แบบทดสอบหลังการอบรม'}
                </p>
                <a
                    href={`/exam/${scheduleId}`}
                    className="block w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    กลับหน้าเลือกแบบทดสอบ
                </a>
            </div>
        </div>
    );
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

export function ExamRunnerClient({
    record, template, config, scheduleId
}: {
    record: TrainingRecord;
    template: ExamTemplate;
    config: ExamConfig;
    scheduleId: string;
}) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const startedAt = useRef(new Date().toISOString());

    // State
    const [phase, setPhase] = useState<Phase>(() => {
        const hasBefore = (config.additionalSections ?? []).some(s => s.placement === 'before');
        return hasBefore ? 'additional_before' : 'questions';
    });
    const [answers, setAnswers] = useState<Record<string, string | null>>({});
    const [additionalBefore, setAdditionalBefore] = useState<Record<string, Record<string, string>>>({});
    const [additionalAfter, setAdditionalAfter] = useState<Record<string, Record<string, string>>>({});
    const [result, setResult] = useState<{ scorePercent: number; rawScore: number; totalPoints: number; passed: boolean | null } | null>(null);

    const beforeSections = (config.additionalSections ?? []).filter(s => s.placement === 'before');
    const afterSections = (config.additionalSections ?? []).filter(s => s.placement === 'after');

    function handleAnswer(questionId: string, optionId: string) {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    }

    function validateRequired(sections: typeof beforeSections, values: Record<string, Record<string, string>>): boolean {
        for (const sec of sections) {
            for (const field of sec.fields) {
                if (field.required && !values[sec.id]?.[field.id]) return false;
            }
        }
        return true;
    }

    function handleSubmit() {
        if (!validateRequired(afterSections, additionalAfter)) {
            toast({ title: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ', variant: 'destructive' });
            return;
        }

        const buildResponses = (
            sections: typeof beforeSections,
            values: Record<string, Record<string, string>>
        ): AdditionalSectionResponse[] =>
            sections.map(sec => ({
                sectionId: sec.id,
                responses: values[sec.id] ?? {},
            }));

        const allAdditional = [
            ...buildResponses(beforeSections, additionalBefore),
            ...buildResponses(afterSections, additionalAfter),
        ];

        startTransition(async () => {
            const res = await submitExamSession({
                examTemplateId: template.id,
                scheduleId,
                courseId: record.courseId,
                trainingRecordId: record.id,
                attendeeName: record.attendeeName,
                seatNumber: record.seatNumber ?? '',
                examType: config.type,
                questions: config.questions,
                answers,
                additionalResponses: allAdditional.length > 0 ? allAdditional : undefined,
                startedAt: startedAt.current,
                passingScore: config.passingScore,
            });

            if (res.success && res.session) {
                setResult({
                    scorePercent: res.session.scorePercent,
                    rawScore: res.session.rawScore,
                    totalPoints: res.session.totalPoints,
                    passed: res.session.passed,
                });
                setPhase('submitted');
            } else {
                toast({ title: res.message, variant: 'destructive' });
            }
        });
    }

    const answeredCount = Object.values(answers).filter(v => v !== null).length;
    const progress = config.questions.length > 0
        ? Math.round((answeredCount / config.questions.length) * 100)
        : 0;

    // Submitted
    if (phase === 'submitted' && result) {
        if (config.showResultAfterSubmit === false) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-8 text-center space-y-5">
                        <div className="text-5xl">✅</div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">ส่งคำตอบแล้ว</p>
                            <h1 className="text-xl font-bold">ส่งคำตอบเรียบร้อยแล้ว</h1>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {config.type === 'pretest' ? 'แบบทดสอบก่อนการอบรม' : 'แบบทดสอบหลังการอบรม'}
                        </p>
                        <a
                            href={`/exam/${scheduleId}`}
                            className="block w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            กลับหน้าเลือกแบบทดสอบ
                        </a>
                    </div>
                </div>
            );
        }
        return (
            <ResultScreen
                scorePercent={result.scorePercent}
                rawScore={result.rawScore}
                totalPoints={result.totalPoints}
                passed={result.passed}
                examType={config.type}
                scheduleId={scheduleId}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-sm">{config.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {phase === 'questions' && (
                            <span className="text-xs text-muted-foreground">
                                {answeredCount}/{config.questions.length} ข้อ
                            </span>
                        )}
                        {config.timeLimitMinutes && phase === 'questions' && (
                            <Timer
                                totalSeconds={config.timeLimitMinutes * 60}
                                onExpire={() => setPhase(afterSections.length > 0 ? 'additional_after' : 'submitted')}
                            />
                        )}
                    </div>
                </div>
                {phase === 'questions' && (
                    <div className="max-w-2xl mx-auto mt-2">
                        <Progress value={progress} className="h-1.5 rounded-full" />
                    </div>
                )}
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Additional before */}
                {phase === 'additional_before' && (
                    <>
                        {beforeSections.map(sec => (
                            <div key={sec.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6">
                                <AdditionalSectionForm
                                    section={sec}
                                    values={additionalBefore[sec.id] ?? {}}
                                    onChange={(fieldId, value) =>
                                        setAdditionalBefore(prev => ({
                                            ...prev,
                                            [sec.id]: { ...(prev[sec.id] ?? {}), [fieldId]: value }
                                        }))
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            className="w-full h-12 rounded-2xl gap-2"
                            onClick={() => {
                                if (!validateRequired(beforeSections, additionalBefore)) {
                                    toast({ title: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ', variant: 'destructive' });
                                    return;
                                }
                                setPhase('questions');
                            }}
                        >
                            ถัดไป <ArrowRight className="w-4 h-4" />
                        </Button>
                    </>
                )}

                {/* Questions */}
                {phase === 'questions' && (
                    <>
                        {config.instructions && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">{config.instructions}</p>
                            </div>
                        )}

                        {config.questions.map((q, i) => (
                            <QuestionCard
                                key={q.id}
                                question={q}
                                index={i}
                                selected={answers[q.id] ?? null}
                                onSelect={optId => handleAnswer(q.id, optId)}
                            />
                        ))}

                        <Button
                            className="w-full h-12 rounded-2xl gap-2"
                            onClick={() => {
                                if (afterSections.length > 0) setPhase('additional_after');
                                else handleSubmit();
                            }}
                            disabled={isPending}
                        >
                            {afterSections.length > 0 ? (
                                <><ArrowRight className="w-4 h-4" /> ถัดไป</>
                            ) : (
                                <>{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} ส่งคำตอบ</>
                            )}
                        </Button>
                    </>
                )}

                {/* Additional after */}
                {phase === 'additional_after' && (
                    <>
                        {afterSections.map(sec => (
                            <div key={sec.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6">
                                <AdditionalSectionForm
                                    section={sec}
                                    values={additionalAfter[sec.id] ?? {}}
                                    onChange={(fieldId, value) =>
                                        setAdditionalAfter(prev => ({
                                            ...prev,
                                            [sec.id]: { ...(prev[sec.id] ?? {}), [fieldId]: value }
                                        }))
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            className="w-full h-12 rounded-2xl gap-2"
                            onClick={handleSubmit}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            ส่งคำตอบ
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
    question, index, selected, onSelect
}: {
    question: ExamQuestion;
    index: number;
    selected: string | null;
    onSelect: (optId: string) => void;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                </span>
                <p className="text-sm font-medium leading-relaxed">{question.text}</p>
            </div>
            <div className="space-y-2">
                {question.options.map(opt => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelect(opt.id)}
                        className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all',
                            selected === opt.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-border hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        )}
                    >
                        <div className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            selected === opt.id
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-muted-foreground/40'
                        )}>
                            {selected === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground shrink-0 w-5">{opt.label}</span>
                        <span className="text-sm">{opt.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
