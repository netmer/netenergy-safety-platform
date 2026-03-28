'use client';

import React, { useState, useTransition } from 'react';
import { nanoid } from 'nanoid';
import type { TrainingSchedule, Client } from '@/lib/course-data';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    MapPin, CalendarDays, Building2, PlusCircle, Trash2,
    Loader2, CheckCircle2, Send, Users
} from 'lucide-react';
import { submitInhouseAttendees, type InhouseAttendeeInput } from './actions';
import Image from 'next/image';

const THAI_TITLES = ['นาย', 'นาง', 'นางสาว', 'ดร.', 'ผศ.', 'รศ.', 'ศ.', 'อื่นๆ'];

interface AttendeeRow extends InhouseAttendeeInput {
    _id: string; // client-side key
}

function formatDateRange(start: string, end: string): string {
    if (!start) return '-';
    try {
        const s = parseISO(start), e = parseISO(end);
        if (start === end) return format(s, 'd MMMM yyyy', { locale: th });
        if (s.getMonth() === e.getMonth()) return `${format(s, 'd')} - ${format(e, 'd MMMM yyyy', { locale: th })}`;
        return `${format(s, 'd MMMM')} - ${format(e, 'd MMMM yyyy', { locale: th })}`;
    } catch { return '-'; }
}

function blankRow(companyName = ''): AttendeeRow {
    return { _id: nanoid(), title: 'นาย', firstName: '', lastName: '', attendeeId: '', companyName };
}

interface Props {
    schedule: TrainingSchedule;
    client: Client | null;
    token: string;
}

export function InhouseRegistrationClientPage({ schedule, client, token }: Props) {
    const defaultCompany = client?.companyName ?? '';
    const [rows, setRows] = useState<AttendeeRow[]>([blankRow(defaultCompany)]);
    const [isPending, startTransition] = useTransition();
    const [submitted, setSubmitted] = useState(false);
    const [submitCount, setSubmitCount] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    const updateRow = (id: string, field: keyof AttendeeRow, value: string) => {
        setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
    };

    const addRow = () => setRows(prev => [...prev, blankRow(defaultCompany)]);

    const removeRow = (id: string) => {
        if (rows.length === 1) return;
        setRows(prev => prev.filter(r => r._id !== id));
    };

    const handleSubmit = () => {
        setErrorMsg('');
        // Validate
        const invalid = rows.find(r => !r.firstName.trim() || !r.lastName.trim() || !r.companyName.trim());
        if (invalid) {
            setErrorMsg('กรุณากรอกชื่อ นามสกุล และชื่อบริษัทให้ครบทุกแถว');
            return;
        }

        startTransition(async () => {
            const input: InhouseAttendeeInput[] = rows.map(r => ({
                title: r.title,
                firstName: r.firstName.trim(),
                lastName: r.lastName.trim(),
                attendeeId: r.attendeeId?.trim() || undefined,
                companyName: r.companyName.trim(),
            }));
            const result = await submitInhouseAttendees(schedule.id, token, input);
            if (result.success) {
                setSubmitCount(result.count);
                setSubmitted(true);
            } else {
                setErrorMsg(result.message);
            }
        });
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold font-headline">ส่งรายชื่อแล้ว!</h2>
                    <p className="text-muted-foreground">เพิ่มผู้เข้าอบรม <strong>{submitCount} คน</strong> เรียบร้อยแล้ว ทีมงานจะดำเนินการต่อไป</p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left space-y-1.5 mt-4">
                        <p className="text-sm font-bold">{schedule.courseTitle}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDateRange(schedule.startDate, schedule.endDate)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {schedule.location}
                        </p>
                    </div>
                    <Button variant="outline" className="rounded-xl font-bold mt-2" onClick={() => {
                        setRows([blankRow(defaultCompany)]);
                        setSubmitted(false);
                        setErrorMsg('');
                    }}>
                        เพิ่มรายชื่อเพิ่มเติม
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
            <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200 font-bold gap-1.5 px-3 py-1 rounded-full">
                        <Building2 className="w-3.5 h-3.5" /> Inhouse Training
                    </Badge>
                    <h1 className="text-3xl font-bold font-headline mt-2">{schedule.courseTitle}</h1>
                </div>

                {/* Schedule Info */}
                <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <CalendarDays className="w-4 h-4 opacity-80" />
                                {formatDateRange(schedule.startDate, schedule.endDate)}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="w-4 h-4 opacity-80" />
                                {schedule.location}
                            </div>
                            {client && (
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Building2 className="w-4 h-4 opacity-80" />
                                    {client.companyName}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Attendee Form */}
                <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold">รายชื่อผู้เข้าอบรม</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">กรอกรายชื่อทุกท่านที่จะเข้าอบรม</p>
                            </div>
                            <Badge variant="outline" className="gap-1 font-bold">
                                <Users className="w-3.5 h-3.5" /> {rows.length} คน
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            {rows.map((row, index) => (
                                <div key={row._id} className="relative bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ผู้เข้าอบรมคนที่ {index + 1}</p>
                                        {rows.length > 1 && (
                                            <button type="button" onClick={() => removeRow(row._id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* คำนำหน้า + ชื่อ */}
                                    <div className="flex gap-2">
                                        <div className="w-[120px] shrink-0">
                                            <Label className="text-xs font-bold mb-1 block">คำนำหน้า</Label>
                                            <Select value={row.title} onValueChange={v => updateRow(row._id, 'title', v)}>
                                                <SelectTrigger className="rounded-xl h-10 text-sm bg-white dark:bg-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {THAI_TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-xs font-bold mb-1 block">ชื่อ *</Label>
                                            <Input
                                                value={row.firstName}
                                                onChange={e => updateRow(row._id, 'firstName', e.target.value)}
                                                placeholder="ชื่อจริง"
                                                className="rounded-xl h-10 text-sm bg-white dark:bg-slate-900"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* นามสกุล */}
                                    <div>
                                        <Label className="text-xs font-bold mb-1 block">นามสกุล *</Label>
                                        <Input
                                            value={row.lastName}
                                            onChange={e => updateRow(row._id, 'lastName', e.target.value)}
                                            placeholder="นามสกุล"
                                            className="rounded-xl h-10 text-sm bg-white dark:bg-slate-900"
                                            required
                                        />
                                    </div>

                                    {/* บริษัท + เลขบัตร */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs font-bold mb-1 block">บริษัท / หน่วยงาน *</Label>
                                            <Input
                                                value={row.companyName}
                                                onChange={e => updateRow(row._id, 'companyName', e.target.value)}
                                                placeholder="ชื่อบริษัท"
                                                className="rounded-xl h-10 text-sm bg-white dark:bg-slate-900"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-bold mb-1 block">เลขบัตรประชาชน <span className="font-normal text-slate-400">(optional)</span></Label>
                                            <Input
                                                value={row.attendeeId ?? ''}
                                                onChange={e => updateRow(row._id, 'attendeeId', e.target.value)}
                                                placeholder="13 หลัก"
                                                maxLength={13}
                                                className="rounded-xl h-10 text-sm font-mono bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button type="button" variant="outline" onClick={addRow}
                            className="w-full rounded-2xl h-12 font-bold border-dashed gap-2 border-violet-300 text-violet-700 hover:bg-violet-50">
                            <PlusCircle className="w-4 h-4" /> เพิ่มผู้เข้าอบรม
                        </Button>

                        {errorMsg && (
                            <p className="text-sm text-destructive font-medium text-center">{errorMsg}</p>
                        )}

                        <Button onClick={handleSubmit} disabled={isPending}
                            className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 gap-2">
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {isPending ? 'กำลังส่งรายชื่อ...' : `ส่งรายชื่อ ${rows.length} คน`}
                        </Button>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-slate-400 pb-6">
                    ลิงก์นี้ใช้สำหรับ {schedule.courseTitle} เท่านั้น • NET Safety Platform
                </p>
            </div>
        </div>
    );
}
