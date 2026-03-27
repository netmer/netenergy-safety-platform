'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ExamTemplate, ExamConfig, ExamQuestion, ExamQuestionOption, AdditionalSection, AdditionalSectionField } from '@/lib/course-data';
import { nanoid } from 'nanoid';
import { updateExamTemplate } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowLeft, Save, Plus, Trash2, GripVertical, CheckCircle2, Circle,
    Loader2, FileQuestion, Settings, List, PlusCircle, X, ChevronDown, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Default factory helpers ─────────────────────────────────────────────────

function makeOption(label: string): ExamQuestionOption {
    return { id: nanoid(), label, text: '' };
}

function makeQuestion(): ExamQuestion {
    return {
        id: nanoid(),
        text: '',
        options: [makeOption('ก.'), makeOption('ข.'), makeOption('ค.'), makeOption('ง.')],
        correctOptionId: '',
        points: 1,
    };
}

function makeDefaultExamConfig(type: 'pretest' | 'posttest'): ExamConfig {
    return {
        type,
        title: type === 'pretest' ? 'แบบทดสอบก่อนการอบรม' : 'แบบทดสอบหลังการอบรม',
        instructions: '',
        timeLimitMinutes: undefined,
        passingScore: undefined,
        shuffleQuestions: false,
        questions: [],
        additionalSections: [],
    };
}

function makeAdditionalSection(placement: 'before' | 'after'): AdditionalSection {
    return {
        id: nanoid(),
        placement,
        title: placement === 'before' ? 'ข้อมูลเพิ่มเติม' : 'แบบสอบถามความพึงพอใจ',
        fields: [],
    };
}

function makeAdditionalField(): AdditionalSectionField {
    return { id: nanoid(), label: '', type: 'text', required: false, options: [] };
}

// ─── Sortable Question Row ────────────────────────────────────────────────────

function SortableQuestion({
    q, index, isSelected, onSelect, onDelete
}: {
    q: ExamQuestion; index: number; isSelected: boolean;
    onSelect: () => void; onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: q.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={cn(
                'flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors',
                isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-border hover:bg-muted/50'
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                onClick={e => e.stopPropagation()}
            >
                <GripVertical className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-muted-foreground w-6 shrink-0 mt-0.5">{index + 1}.</span>
            <p className={cn('flex-1 text-sm line-clamp-2', !q.text && 'text-muted-foreground italic')}>
                {q.text || 'คำถามใหม่ (ยังไม่ได้กรอก)'}
            </p>
            <div className="flex items-center gap-1 shrink-0">
                {q.correctOptionId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Question Editor Panel ────────────────────────────────────────────────────

function QuestionEditor({
    question, onChange
}: {
    question: ExamQuestion;
    onChange: (q: ExamQuestion) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label>คำถาม</Label>
                <Textarea
                    value={question.text}
                    onChange={e => onChange({ ...question, text: e.target.value })}
                    placeholder="พิมพ์คำถามที่นี่..."
                    rows={3}
                    className="resize-none rounded-xl"
                />
            </div>

            <div className="space-y-1.5">
                <Label>คะแนน</Label>
                <Input
                    type="number"
                    min={1}
                    max={100}
                    value={question.points}
                    onChange={e => onChange({ ...question, points: Number(e.target.value) || 1 })}
                    className="rounded-xl w-24"
                />
            </div>

            <Separator />

            <div className="space-y-2">
                <Label>ตัวเลือก <span className="text-muted-foreground text-xs">(คลิก ✓ เพื่อเลือกคำตอบที่ถูก)</span></Label>
                {question.options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onChange({ ...question, correctOptionId: opt.id })}
                            className={cn(
                                'shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors',
                                question.correctOptionId === opt.id
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-muted-foreground/40 hover:border-emerald-400'
                            )}
                        >
                            {question.correctOptionId === opt.id
                                ? <CheckCircle2 className="w-3.5 h-3.5" />
                                : <Circle className="w-3.5 h-3.5" />
                            }
                        </button>
                        <span className="text-sm font-medium w-6 shrink-0 text-muted-foreground">{opt.label}</span>
                        <Input
                            value={opt.text}
                            onChange={e => {
                                const newOpts = question.options.map((o, j) =>
                                    j === i ? { ...o, text: e.target.value } : o
                                );
                                onChange({ ...question, options: newOpts });
                            }}
                            placeholder={`ตัวเลือก ${opt.label}`}
                            className="rounded-xl h-9 flex-1"
                        />
                        {question.options.length > 2 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const newOpts = question.options.filter((_, j) => j !== i);
                                    const newCorrect = question.correctOptionId === opt.id ? '' : question.correctOptionId;
                                    onChange({ ...question, options: newOpts, correctOptionId: newCorrect });
                                }}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                {question.options.length < 6 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => {
                            const labels = ['ก.', 'ข.', 'ค.', 'ง.', 'จ.', 'ฉ.'];
                            const newLabel = labels[question.options.length] ?? `${question.options.length + 1}.`;
                            onChange({ ...question, options: [...question.options, makeOption(newLabel)] });
                        }}
                    >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มตัวเลือก
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── Additional Sections Editor ───────────────────────────────────────────────

function AdditionalSectionsEditor({
    sections, onChange
}: {
    sections: AdditionalSection[];
    onChange: (sections: AdditionalSection[]) => void;
}) {
    function updateSection(id: string, updates: Partial<AdditionalSection>) {
        onChange(sections.map(s => s.id === id ? { ...s, ...updates } : s));
    }

    function addField(sectionId: string) {
        onChange(sections.map(s =>
            s.id === sectionId
                ? { ...s, fields: [...s.fields, makeAdditionalField()] }
                : s
        ));
    }

    function updateField(sectionId: string, fieldId: string, updates: Partial<AdditionalSectionField>) {
        onChange(sections.map(s =>
            s.id === sectionId
                ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
                : s
        ));
    }

    function removeField(sectionId: string, fieldId: string) {
        onChange(sections.map(s =>
            s.id === sectionId
                ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
                : s
        ));
    }

    function removeSection(id: string) {
        onChange(sections.filter(s => s.id !== id));
    }

    return (
        <div className="space-y-3">
            {sections.map(section => (
                <Card key={section.id} className="rounded-xl border border-border">
                    <CardHeader className="pb-3 pt-4 px-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {section.placement === 'before' ? 'ก่อนข้อสอบ' : 'หลังข้อสอบ'}
                            </Badge>
                            <Input
                                value={section.title}
                                onChange={e => updateSection(section.id, { title: e.target.value })}
                                className="h-8 rounded-lg font-medium flex-1"
                            />
                            <button onClick={() => removeSection(section.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        {section.fields.map(field => (
                            <div key={field.id} className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg">
                                <Input
                                    value={field.label}
                                    onChange={e => updateField(section.id, field.id, { label: e.target.value })}
                                    placeholder="ชื่อคำถาม"
                                    className="h-8 rounded-lg flex-1"
                                />
                                <Select
                                    value={field.type}
                                    onValueChange={v => updateField(section.id, field.id, { type: v as AdditionalSectionField['type'] })}
                                >
                                    <SelectTrigger className="h-8 rounded-lg w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">ข้อความ</SelectItem>
                                        <SelectItem value="number">ตัวเลข</SelectItem>
                                        <SelectItem value="textarea">ข้อความยาว</SelectItem>
                                        <SelectItem value="select">เลือก (Dropdown)</SelectItem>
                                        <SelectItem value="radio">เลือก (Radio)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-1">
                                    <Switch
                                        checked={field.required}
                                        onCheckedChange={v => updateField(section.id, field.id, { required: v })}
                                        className="scale-75"
                                    />
                                    <span className="text-xs text-muted-foreground">จำเป็น</span>
                                </div>
                                {(field.type === 'select' || field.type === 'radio') && (
                                    <Input
                                        value={field.options?.map(o => o.label).join(', ') ?? ''}
                                        onChange={e => {
                                            const labels = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                            updateField(section.id, field.id, {
                                                options: labels.map(l => ({ id: nanoid(), label: l, value: l }))
                                            });
                                        }}
                                        placeholder="ตัวเลือก (คั่นด้วย ,)"
                                        className="h-8 rounded-lg w-40"
                                    />
                                )}
                                <button onClick={() => removeField(section.id, field.id)} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => addField(section.id)}>
                            <Plus className="w-3.5 h-3.5" /> เพิ่มคำถาม
                        </Button>
                    </CardContent>
                </Card>
            ))}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs rounded-xl"
                    onClick={() => onChange([...sections, makeAdditionalSection('before')])}
                >
                    <Plus className="w-3.5 h-3.5" /> ส่วนก่อนข้อสอบ
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs rounded-xl"
                    onClick={() => onChange([...sections, makeAdditionalSection('after')])}
                >
                    <Plus className="w-3.5 h-3.5" /> ส่วนหลังข้อสอบ
                </Button>
            </div>
        </div>
    );
}

// ─── Exam Config Editor Tab ───────────────────────────────────────────────────

function ExamConfigEditor({
    config, onChange
}: {
    config: ExamConfig;
    onChange: (c: ExamConfig) => void;
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

    const selectedQuestion = config.questions.find(q => q.id === selectedQuestionId) ?? null;

    function addQuestion() {
        const q = makeQuestion();
        onChange({ ...config, questions: [...config.questions, q] });
        setSelectedQuestionId(q.id);
    }

    function updateQuestion(q: ExamQuestion) {
        onChange({ ...config, questions: config.questions.map(old => old.id === q.id ? q : old) });
    }

    function deleteQuestion(id: string) {
        onChange({ ...config, questions: config.questions.filter(q => q.id !== id) });
        if (selectedQuestionId === id) setSelectedQuestionId(null);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = config.questions.findIndex(q => q.id === active.id);
        const newIndex = config.questions.findIndex(q => q.id === over.id);
        onChange({ ...config, questions: arrayMove(config.questions, oldIndex, newIndex) });
    }

    const totalPoints = config.questions.reduce((s, q) => s + q.points, 0);

    return (
        <div className="space-y-6">
            {/* Config Settings */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> ตั้งค่าการทดสอบ</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs">ชื่อการทดสอบ</Label>
                        <Input
                            value={config.title}
                            onChange={e => onChange({ ...config, title: e.target.value })}
                            className="rounded-xl h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">เวลาทำข้อสอบ (นาที)</Label>
                        <Input
                            type="number"
                            min={1}
                            value={config.timeLimitMinutes ?? ''}
                            onChange={e => onChange({ ...config, timeLimitMinutes: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="ไม่จำกัด"
                            className="rounded-xl h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">คะแนนผ่าน (%)</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={config.passingScore ?? ''}
                            onChange={e => onChange({ ...config, passingScore: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="ไม่กำหนด"
                            className="rounded-xl h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">สับเปลี่ยนข้อสอบ</Label>
                        <div className="flex items-center gap-2 h-9">
                            <Switch
                                checked={config.shuffleQuestions}
                                onCheckedChange={v => onChange({ ...config, shuffleQuestions: v })}
                            />
                            <span className="text-sm text-muted-foreground">
                                {config.shuffleQuestions ? 'เปิด' : 'ปิด'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">แสดงผลหลังส่ง</Label>
                        <div className="flex items-center gap-2 h-9">
                            <Switch
                                checked={config.showResultAfterSubmit !== false}
                                onCheckedChange={v => onChange({ ...config, showResultAfterSubmit: v })}
                            />
                            <span className="text-sm text-muted-foreground">
                                {config.showResultAfterSubmit !== false ? 'แสดง' : 'ซ่อน'}
                            </span>
                        </div>
                    </div>
                </CardContent>
                {config.instructions !== undefined && (
                    <CardContent className="pt-0">
                        <div className="space-y-1.5">
                            <Label className="text-xs">คำชี้แจง</Label>
                            <Textarea
                                value={config.instructions ?? ''}
                                onChange={e => onChange({ ...config, instructions: e.target.value })}
                                placeholder="คำชี้แจงก่อนทำข้อสอบ..."
                                rows={2}
                                className="resize-none rounded-xl"
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Questions Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Question List */}
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <List className="w-4 h-4" /> ข้อสอบ ({config.questions.length} ข้อ / {totalPoints} คะแนน)
                        </CardTitle>
                        <Button size="sm" className="rounded-xl gap-1 h-8" onClick={addQuestion}>
                            <Plus className="w-3.5 h-3.5" /> เพิ่มข้อ
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                        {config.questions.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-muted-foreground gap-2 text-sm">
                                <FileQuestion className="w-8 h-8 opacity-30" />
                                <p>ยังไม่มีข้อสอบ กดปุ่ม "เพิ่มข้อ" เพื่อเริ่ม</p>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={config.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    {config.questions.map((q, i) => (
                                        <SortableQuestion
                                            key={q.id}
                                            q={q}
                                            index={i}
                                            isSelected={selectedQuestionId === q.id}
                                            onSelect={() => setSelectedQuestionId(q.id)}
                                            onDelete={() => deleteQuestion(q.id)}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Question Editor */}
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                            {selectedQuestion
                                ? `แก้ไขข้อที่ ${config.questions.findIndex(q => q.id === selectedQuestion.id) + 1}`
                                : 'เลือกข้อสอบเพื่อแก้ไข'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedQuestion ? (
                            <QuestionEditor
                                question={selectedQuestion}
                                onChange={updateQuestion}
                            />
                        ) : (
                            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2 text-sm">
                                <p>คลิกที่ข้อสอบทางซ้ายเพื่อแก้ไข</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Additional Sections */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">ส่วนคำถามเพิ่มเติม (ไม่คิดคะแนน)</CardTitle>
                    <p className="text-xs text-muted-foreground">เพิ่มคำถามข้อมูลส่วนตัว หรือแบบสอบถามความพึงพอใจ ก่อนหรือหลังข้อสอบ</p>
                </CardHeader>
                <CardContent>
                    <AdditionalSectionsEditor
                        sections={config.additionalSections ?? []}
                        onChange={sections => onChange({ ...config, additionalSections: sections })}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ExamEditorClientPage({
    template: initialTemplate,
    backHref = '/erp/exams',
}: {
    template: ExamTemplate;
    backHref?: string;
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [template, setTemplate] = useState<ExamTemplate>(initialTemplate);

    function updatePretest(config: ExamConfig) {
        setTemplate(t => ({ ...t, pretest: config }));
    }

    function updatePosttest(config: ExamConfig) {
        setTemplate(t => ({ ...t, posttest: config }));
    }

    function ensureConfig(type: 'pretest' | 'posttest') {
        if (type === 'pretest' && !template.pretest) {
            setTemplate(t => ({ ...t, pretest: makeDefaultExamConfig('pretest') }));
        }
        if (type === 'posttest' && !template.posttest) {
            setTemplate(t => ({ ...t, posttest: makeDefaultExamConfig('posttest') }));
        }
    }

    function cloneQuestions(questions: ExamQuestion[]) {
        return questions.map(q => {
            const optIdMap = new Map(q.options.map(o => [o.id, nanoid()]));
            return {
                ...q,
                id: nanoid(),
                options: q.options.map(o => ({ ...o, id: optIdMap.get(o.id)! })),
                correctOptionId: optIdMap.get(q.correctOptionId) ?? q.correctOptionId,
            };
        });
    }

    function copyPreToPost() {
        if (!template.pretest?.questions.length) return;
        const cloned = cloneQuestions(template.pretest.questions);
        setTemplate(t => ({
            ...t,
            posttest: { ...(t.posttest ?? makeDefaultExamConfig('posttest')), questions: cloned },
        }));
        toast({ title: `คัดลอก ${cloned.length} ข้อจากก่อนเรียนไปหลังเรียนแล้ว` });
    }

    function copyPostToPre() {
        if (!template.posttest?.questions.length) return;
        const cloned = cloneQuestions(template.posttest.questions);
        setTemplate(t => ({
            ...t,
            pretest: { ...(t.pretest ?? makeDefaultExamConfig('pretest')), questions: cloned },
        }));
        toast({ title: `คัดลอก ${cloned.length} ข้อจากหลังเรียนไปก่อนเรียนแล้ว` });
    }

    function handleSave() {
        startTransition(async () => {
            const result = await updateExamTemplate(template.id, {
                name: template.name,
                examMode: template.examMode,
                pretest: template.pretest,
                posttest: template.posttest,
            });
            toast({ title: result.message, variant: result.success ? 'default' : 'destructive' });
        });
    }

    const showPretest = template.examMode === 'pretest_only' || template.examMode === 'both';
    const showPosttest = template.examMode === 'posttest_only' || template.examMode === 'both';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push(backHref)} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold font-headline">{template.name}</h1>
                        <p className="text-sm text-muted-foreground">{template.courseTitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={template.examMode}
                        onValueChange={mode => {
                            setTemplate(t => ({ ...t, examMode: mode as ExamTemplate['examMode'] }));
                            ensureConfig(mode === 'pretest_only' || mode === 'both' ? 'pretest' : 'posttest');
                        }}
                    >
                        <SelectTrigger className="rounded-xl w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">ก่อนเรียนและหลังเรียน</SelectItem>
                            <SelectItem value="posttest_only">หลังเรียนเท่านั้น</SelectItem>
                            <SelectItem value="pretest_only">ก่อนเรียนเท่านั้น</SelectItem>
                            <SelectItem value="none">ไม่มีการทดสอบ</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSave} disabled={isPending} className="gap-2 rounded-xl">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        บันทึก
                    </Button>
                </div>
            </div>

            {/* Exam Type Tabs */}
            {template.examMode === 'none' ? (
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                        <FileQuestion className="w-10 h-10 opacity-30" />
                        <p>หลักสูตรนี้ตั้งค่าเป็น "ไม่มีการทดสอบ"</p>
                        <p className="text-xs">เปลี่ยนรูปแบบการทดสอบด้านบนเพื่อเพิ่มข้อสอบ</p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue={showPretest ? 'pretest' : 'posttest'}>
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                        <TabsList className="rounded-xl">
                            {showPretest && <TabsTrigger value="pretest" className="rounded-lg">ก่อนเรียน (Pre-test)</TabsTrigger>}
                            {showPosttest && <TabsTrigger value="posttest" className="rounded-lg">หลังเรียน (Post-test)</TabsTrigger>}
                        </TabsList>
                        {showPretest && showPosttest && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-8"
                                    onClick={copyPreToPost} disabled={!template.pretest?.questions.length}>
                                    <Copy className="w-3.5 h-3.5" /> ก่อนเรียน → หลังเรียน
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-8"
                                    onClick={copyPostToPre} disabled={!template.posttest?.questions.length}>
                                    <Copy className="w-3.5 h-3.5" /> หลังเรียน → ก่อนเรียน
                                </Button>
                            </div>
                        )}
                    </div>
                    {showPretest && (
                        <TabsContent value="pretest">
                            <ExamConfigEditor
                                config={template.pretest ?? makeDefaultExamConfig('pretest')}
                                onChange={updatePretest}
                            />
                        </TabsContent>
                    )}
                    {showPosttest && (
                        <TabsContent value="posttest">
                            <ExamConfigEditor
                                config={template.posttest ?? makeDefaultExamConfig('posttest')}
                                onChange={updatePosttest}
                            />
                        </TabsContent>
                    )}
                </Tabs>
            )}
        </div>
    );
}
