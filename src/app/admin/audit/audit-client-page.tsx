'use client';

import { useState, useMemo } from 'react';
import type { AuditLogEntry } from '@/lib/audit';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    status_change: 'bg-yellow-100 text-yellow-800',
    payment: 'bg-purple-100 text-purple-800',
};

const actionLabels: Record<string, string> = {
    create: 'สร้าง',
    update: 'แก้ไข',
    delete: 'ลบ',
    status_change: 'เปลี่ยนสถานะ',
    payment: 'ชำระเงิน',
};

const collectionLabels: Record<string, string> = {
    trainingSchedules: 'รอบอบรม',
    registrations: 'ใบสมัคร',
    trainingRecords: 'บันทึกผู้อบรม',
    auditLog: 'Audit Log',
};

function formatTimestamp(ts: any): string {
    try {
        const date = ts?.toDate ? ts.toDate() : new Date(ts);
        return format(date, 'd MMM yyyy HH:mm', { locale: th });
    } catch {
        return '-';
    }
}

export default function AuditClientPage({ logs }: { logs: AuditLogEntry[] }) {
    const [collectionFilter, setCollectionFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');

    const collections = useMemo(() => ['all', ...Array.from(new Set(logs.map(l => l.collectionName)))], [logs]);
    const actions = useMemo(() => ['all', ...Array.from(new Set(logs.map(l => l.action)))], [logs]);

    const filtered = useMemo(() => logs.filter(l =>
        (collectionFilter === 'all' || l.collectionName === collectionFilter) &&
        (actionFilter === 'all' || l.action === actionFilter)
    ), [logs, collectionFilter, actionFilter]);

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline">Audit Log</h1>
                    <p className="text-muted-foreground font-light text-sm">บันทึกการเปลี่ยนแปลงสำคัญในระบบ (100 รายการล่าสุด)</p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                    <SelectTrigger className="w-44 h-9 rounded-xl text-sm">
                        <SelectValue placeholder="Collection" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุก Collection</SelectItem>
                        {collections.filter(c => c !== 'all').map(c => (
                            <SelectItem key={c} value={c}>{collectionLabels[c] || c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-44 h-9 rounded-xl text-sm">
                        <SelectValue placeholder="การดำเนินการ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกการดำเนินการ</SelectItem>
                        {actions.filter(a => a !== 'all').map(a => (
                            <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-1">แสดง {filtered.length} / {logs.length} รายการ</span>
            </div>

            <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="pt-6">
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground italic">ไม่พบรายการที่ตรงกับตัวกรอง</div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/20">
                                    <tr>
                                        <th className="text-left p-3 font-semibold">เวลา</th>
                                        <th className="text-left p-3 font-semibold">การดำเนินการ</th>
                                        <th className="text-left p-3 font-semibold">Collection</th>
                                        <th className="text-left p-3 font-semibold">Document ID</th>
                                        <th className="text-left p-3 font-semibold">ผู้ดำเนินการ</th>
                                        <th className="text-left p-3 font-semibold">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map((log, i) => (
                                        <tr key={log.id || i} className="hover:bg-muted/5">
                                            <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                                                {formatTimestamp(log.timestamp)}
                                            </td>
                                            <td className="p-3">
                                                <Badge className={`text-[10px] font-bold ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                                                    {actionLabels[log.action] || log.action}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-xs">
                                                {collectionLabels[log.collectionName] || log.collectionName}
                                            </td>
                                            <td className="p-3">
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                    {log.documentId?.slice(0, 12)}…
                                                </code>
                                            </td>
                                            <td className="p-3 text-xs">{log.performedBy || '-'}</td>
                                            <td className="p-3 text-xs text-muted-foreground">{log.note || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
