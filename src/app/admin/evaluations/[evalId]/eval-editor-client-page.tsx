'use client';

import React, { useState, useTransition } from 'react';
import { nanoid } from 'nanoid';
import type { EvaluationTemplate, EvaluationSection, EvaluationItem, EvaluationOpenQuestion } from '@/lib/course-data';
import { updateEvaluationTemplate } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Loader2, Save, Plus, Trash2, GripVertical,
    ChevronDown, ChevronUp, ClipboardCheck
} from 'lucide-react';

export function EvalEditorClientPage({ template: initial }: { template: EvaluationTemplate }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState(initial.name);
    const [sections, setSections] = useState<EvaluationSection[]>(initial.sections);
    const [openQuestions, setOpenQuestions] = useState<EvaluationOpenQuestion[]>(initial.openQuestions);

    // ── Save ───────────────────────────────────────────────────────────────────
    function handleSave() {
        startTransition(async () => {
            const result = await updateEvaluationTemplate(initial.id, { name, sections, openQuestions });
            toast({ title: result.message, variant: result.success ? 'default' : 'destructive' });
        });
    }

    // ── Section helpers ────────────────────────────────────────────────────────
    function addSection() {
        setSections(prev => [...prev, { id: nanoid(), title: 'ส่วนใหม่', items: [] }]);
    }

    function updateSectionTitle(sectionId: string, title: string) {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title } : s));
    }

    function removeSection(sectionId: string) {
        setSections(prev => prev.filter(s => s.id !== sectionId));
    }

    function moveSection(index: number, dir: -1 | 1) {
        setSections(prev => {
            const arr = [...prev];
            const target = index + dir;
            if (target < 0 || target >= arr.length) return arr;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
    }

    // ── Item helpers ───────────────────────────────────────────────────────────
    function addItem(sectionId: string) {
        setSections(prev => prev.map(s =>
            s.id !== sectionId ? s : {
                ...s,
                items: [...s.items, { id: nanoid(), label: 'หัวข้อใหม่' }]
            }
        ));
    }

    function updateItem(sectionId: string, itemId: string, label: string) {
        setSections(prev => prev.map(s =>
            s.id !== sectionId ? s : {
                ...s,
                items: s.items.map(item => item.id === itemId ? { ...item, label } : item)
            }
        ));
    }

    function removeItem(sectionId: string, itemId: string) {
        setSections(prev => prev.map(s =>
            s.id !== sectionId ? s : { ...s, items: s.items.filter(item => item.id !== itemId) }
        ));
    }

    function moveItem(sectionId: string, index: number, dir: -1 | 1) {
        setSections(prev => prev.map(s => {
            if (s.id !== sectionId) return s;
            const arr = [...s.items];
            const target = index + dir;
            if (target < 0 || target >= arr.length) return s;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return { ...s, items: arr };
        }));
    }

    // ── Open question helpers ──────────────────────────────────────────────────
    function addOpenQuestion() {
        setOpenQuestions(prev => [...prev, { id: nanoid(), label: 'คำถามใหม่', required: false }]);
    }

    function updateOpenQuestion(id: string, patch: Partial<EvaluationOpenQuestion>) {
        setOpenQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
    }

    function removeOpenQuestion(id: string) {
        setOpenQuestions(prev => prev.filter(q => q.id !== id));
    }

    const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                        <ClipboardCheck className="w-6 h-6 text-violet-600" /> แก้ไขแบบประเมิน
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{initial.courseTitle}</p>
                </div>
                <Button onClick={handleSave} disabled={isPending} className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึก
                </Button>
            </div>

            {/* Template name */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader><CardTitle className="text-sm text-muted-foreground">ชื่อแบบประเมิน</CardTitle></CardHeader>
                <CardContent>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="rounded-xl text-base font-medium"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        {sections.length} ส่วน · {totalItems} หัวข้อประเมิน · {openQuestions.length} คำถามปลายเปิด
                    </p>
                </CardContent>
            </Card>

            {/* Sections */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">หัวข้อประเมิน</h2>
                    <Button variant="outline" size="sm" onClick={addSection} className="gap-2 rounded-xl">
                        <Plus className="w-3.5 h-3.5" /> เพิ่มส่วน
                    </Button>
                </div>

                {sections.map((section, sIdx) => (
                    <Card key={section.id} className="rounded-2xl border shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                <Input
                                    value={section.title}
                                    onChange={e => updateSectionTitle(section.id, e.target.value)}
                                    className="rounded-xl font-semibold text-sm h-8 flex-1"
                                    placeholder="ชื่อส่วน..."
                                />
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0}>
                                        <ChevronUp className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSection(sIdx, 1)} disabled={sIdx === sections.length - 1}>
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeSection(section.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                            {section.items.map((item, iIdx) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{iIdx + 1}.</span>
                                    <Input
                                        value={item.label}
                                        onChange={e => updateItem(section.id, item.id, e.target.value)}
                                        className="rounded-xl text-sm h-8 flex-1"
                                        placeholder="ชื่อหัวข้อ..."
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveItem(section.id, iIdx, -1)} disabled={iIdx === 0}>
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveItem(section.id, iIdx, 1)} disabled={iIdx === section.items.length - 1}>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(section.id, item.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => addItem(section.id)} className="gap-2 text-violet-600 hover:text-violet-700 w-full rounded-xl mt-1">
                                <Plus className="w-3.5 h-3.5" /> เพิ่มหัวข้อ
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {sections.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-muted-foreground text-sm">
                        ยังไม่มีส่วนประเมิน กดปุ่ม "เพิ่มส่วน" เพื่อเริ่มต้น
                    </div>
                )}
            </div>

            {/* Open questions */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">คำถามปลายเปิด</h2>
                    <Button variant="outline" size="sm" onClick={addOpenQuestion} className="gap-2 rounded-xl">
                        <Plus className="w-3.5 h-3.5" /> เพิ่มคำถาม
                    </Button>
                </div>

                {openQuestions.map((q, qIdx) => (
                    <Card key={q.id} className="rounded-2xl border shadow-sm">
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{qIdx + 1}.</span>
                                <Input
                                    value={q.label}
                                    onChange={e => updateOpenQuestion(q.id, { label: e.target.value })}
                                    className="rounded-xl text-sm h-8 flex-1"
                                    placeholder="ข้อความคำถาม..."
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeOpenQuestion(q.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 pl-7">
                                <Switch
                                    id={`req-${q.id}`}
                                    checked={q.required}
                                    onCheckedChange={v => updateOpenQuestion(q.id, { required: v })}
                                />
                                <Label htmlFor={`req-${q.id}`} className="text-sm cursor-pointer">
                                    จำเป็นต้องตอบ
                                </Label>
                                {q.required && <Badge variant="destructive" className="text-xs px-1.5 py-0">บังคับ</Badge>}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {openQuestions.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-muted-foreground text-sm">
                        ไม่มีคำถามปลายเปิด (ไม่จำเป็น)
                    </div>
                )}
            </div>

            {/* Save button at bottom */}
            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={isPending} className="gap-2 bg-violet-600 hover:bg-violet-700">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึกแบบประเมิน
                </Button>
            </div>
        </div>
    );
}
