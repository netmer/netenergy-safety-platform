'use client';

import React, { useState, useMemo, useTransition } from 'react';
import type { DeliveryPackage, DeliveryItemStatus, DeliverableType, Course, TrainingSchedule } from '@/lib/course-data';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Package, MapPin, ChevronDown, ChevronUp, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateDeliveryItemStatus, updatePackageMeta, batchUpdateSchedulePackages } from './actions';
import { useAuth } from '@/context/auth-context';

const STATUS_CONFIG: Record<DeliveryItemStatus, { label: string; color: string }> = {
    'รอดำเนินการ': { label: 'รอดำเนินการ', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    'กำลังเตรียม': { label: 'กำลังเตรียม', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'จัดส่งแล้ว': { label: 'จัดส่งแล้ว', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'ได้รับแล้ว': { label: 'ได้รับแล้ว', color: 'bg-green-100 text-green-800 border-green-200' },
    'ไม่มี': { label: 'ไม่มี', color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const ALL_STATUSES: DeliveryItemStatus[] = ['รอดำเนินการ', 'กำลังเตรียม', 'จัดส่งแล้ว', 'ได้รับแล้ว', 'ไม่มี'];

function StatusBadge({ status }: { status: DeliveryItemStatus }) {
    const cfg = STATUS_CONFIG[status];
    return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.color)}>{cfg.label}</span>;
}

function formatAddress(addr: DeliveryPackage['recipientAddress']): string {
    if (!addr) return '-';
    return [addr.address1, addr.subdistrict, addr.district, addr.province, addr.postalCode].filter(Boolean).join(' ');
}

function formatDate(iso: string): string {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
}

interface DeliveryDetailDialogProps {
    pkg: DeliveryPackage;
    open: boolean;
    onClose: () => void;
    onUpdated: (updated: DeliveryPackage) => void;
    actorName: string;
}

function DeliveryDetailDialog({ pkg, open, onClose, onUpdated, actorName }: DeliveryDetailDialogProps) {
    const [localPkg, setLocalPkg] = useState<DeliveryPackage>(pkg);
    const [trackingNumber, setTrackingNumber] = useState(pkg.trackingNumber || '');
    const [notes, setNotes] = useState(pkg.notes || '');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    React.useEffect(() => { setLocalPkg(pkg); setTrackingNumber(pkg.trackingNumber || ''); setNotes(pkg.notes || ''); }, [pkg]);

    const handleStatusChange = (itemType: DeliverableType, newStatus: DeliveryItemStatus) => {
        startTransition(async () => {
            const res = await updateDeliveryItemStatus(pkg.id, itemType, newStatus, actorName);
            if (res.success) {
                const updatedItems = localPkg.items.map(i => i.type === itemType ? { ...i, status: newStatus } : i);
                const updated = { ...localPkg, items: updatedItems };
                setLocalPkg(updated);
                onUpdated(updated);
            } else {
                toast({ title: 'เกิดข้อผิดพลาด', description: res.message, variant: 'destructive' });
            }
        });
    };

    const handleSaveMeta = () => {
        startTransition(async () => {
            const res = await updatePackageMeta(pkg.id, { trackingNumber, notes });
            if (res.success) {
                const updated = { ...localPkg, trackingNumber, notes };
                setLocalPkg(updated);
                onUpdated(updated);
                toast({ title: 'บันทึกสำเร็จ' });
            } else {
                toast({ title: 'เกิดข้อผิดพลาด', description: res.message, variant: 'destructive' });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">รายละเอียดการจัดส่ง</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-2">
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 space-y-1">
                        <p className="font-semibold text-lg">{localPkg.clientCompanyName || localPkg.recipientName}</p>
                        <p className="text-sm text-muted-foreground">{localPkg.courseTitle}</p>
                        <p className="text-sm text-muted-foreground">วันอบรม: {formatDate(localPkg.scheduleDate)}</p>
                        <div className="flex items-start gap-2 text-sm mt-2 text-slate-600">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                            <span>{formatAddress(localPkg.recipientAddress) || 'ไม่มีที่อยู่'}</span>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-semibold mb-2 block">รายการจัดส่ง</Label>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รายการ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {localPkg.items.length === 0 && (
                                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">ไม่มีรายการ</TableCell></TableRow>
                                )}
                                {localPkg.items.map(item => (
                                    <TableRow key={item.type}>
                                        <TableCell className="font-medium">{item.label}</TableCell>
                                        <TableCell>
                                            <Select value={item.status} onValueChange={(v) => handleStatusChange(item.type, v as DeliveryItemStatus)} disabled={isPending}>
                                                <SelectTrigger className="w-40 h-8 rounded-lg text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ALL_STATUSES.map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <Label htmlFor="tracking" className="text-sm">เลขพัสดุ / Tracking</Label>
                            <Input id="tracking" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="เช่น TH123456789" className="mt-1 rounded-xl" />
                        </div>
                        <div>
                            <Label htmlFor="notes" className="text-sm">หมายเหตุ</Label>
                            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="บันทึกเพิ่มเติม..." className="mt-1 rounded-xl resize-none" rows={2} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="rounded-xl">ปิด</Button>
                    <Button onClick={handleSaveMeta} disabled={isPending} className="rounded-xl">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DeliveryClientPageProps {
    courses: Course[];
    schedules: TrainingSchedule[];
    initialScheduleId?: string | null;
}

export function DeliveryClientPage({ courses, schedules, initialScheduleId }: DeliveryClientPageProps) {
    const { profile } = useAuth();
    const actorName = profile?.displayName || profile?.nickname || 'ระบบ';
    const firestore = useFirestore();

    const packagesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'deliveryPackages'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: packagesData, isLoading: pkgLoading } = useCollection<DeliveryPackage>(packagesQuery);
    const livePackages = packagesData ?? [];

    const [localUpdates, setLocalUpdates] = useState<Map<string, DeliveryPackage>>(new Map());
    const packages = livePackages.map(p => localUpdates.get(p.id) ?? p);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<DeliveryItemStatus | 'all'>('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [scheduleFilter, setScheduleFilter] = useState<string>(initialScheduleId ?? 'all');
    const [selectedPkg, setSelectedPkg] = useState<DeliveryPackage | null>(null);
    const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(
        initialScheduleId ? new Set([initialScheduleId]) : new Set()
    );
    const [batchingSchedule, setBatchingSchedule] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleUpdated = (updated: DeliveryPackage) => {
        setLocalUpdates(prev => new Map(prev).set(updated.id, updated));
        if (selectedPkg?.id === updated.id) setSelectedPkg(updated);
    };

    const filtered = useMemo(() => packages.filter(p => {
        if (searchQuery && !p.clientCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) && !p.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (statusFilter !== 'all' && p.overallStatus !== statusFilter) return false;
        if (courseFilter !== 'all' && p.courseId !== courseFilter) return false;
        if (scheduleFilter !== 'all' && p.scheduleId !== scheduleFilter) return false;
        return true;
    }), [packages, searchQuery, statusFilter, courseFilter, scheduleFilter]);

    // Group by schedule for Tab 2
    const groupedBySchedule = useMemo(() => {
        const groups = new Map<string, { schedule: TrainingSchedule | undefined; packages: DeliveryPackage[] }>();
        packages.forEach(p => {
            if (!groups.has(p.scheduleId)) {
                groups.set(p.scheduleId, {
                    schedule: schedules.find(s => s.id === p.scheduleId),
                    packages: [],
                });
            }
            groups.get(p.scheduleId)!.packages.push(p);
        });
        return Array.from(groups.entries())
            .map(([sid, val]) => ({ scheduleId: sid, ...val }))
            .sort((a, b) => (b.schedule?.startDate || '').localeCompare(a.schedule?.startDate || ''));
    }, [packages, schedules]);

    const handleBatchUpdate = (scheduleId: string, newStatus: DeliveryItemStatus) => {
        setBatchingSchedule(scheduleId);
        startTransition(async () => {
            const res = await batchUpdateSchedulePackages(scheduleId, newStatus, actorName);
            if (res.success) {
                setLocalUpdates(prev => {
                    const next = new Map(prev);
                    packages.filter(p => p.scheduleId === scheduleId).forEach(p => {
                        const updatedItems = p.items.map(i => i.status !== 'ไม่มี' ? { ...i, status: newStatus } : i);
                        next.set(p.id, { ...p, items: updatedItems, overallStatus: newStatus });
                    });
                    return next;
                });
                toast({ title: 'อัปเดตสำเร็จ', description: res.message });
            } else {
                toast({ title: 'เกิดข้อผิดพลาด', description: res.message, variant: 'destructive' });
            }
            setBatchingSchedule(null);
        });
    };

    const toggleSchedule = (sid: string) => {
        setExpandedSchedules(prev => {
            const next = new Set(prev);
            next.has(sid) ? next.delete(sid) : next.add(sid);
            return next;
        });
    };

    return (
        <div className="space-y-6 pb-20">
            <Tabs defaultValue={initialScheduleId ? 'by-schedule' : 'list'}>
                <TabsList className="rounded-xl">
                    <TabsTrigger value="list" className="rounded-lg">รายการจัดส่ง</TabsTrigger>
                    <TabsTrigger value="by-schedule" className="rounded-lg">จัดกลุ่มตามรอบ</TabsTrigger>
                </TabsList>

                {/* Tab 1: All deliveries list */}
                <TabsContent value="list" className="mt-6">
                    <Card className="border-none shadow-sm rounded-3xl">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ค้นหาบริษัท / เลขพัสดุ..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="pl-9 rounded-xl"
                                    />
                                </div>
                                <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                                    <SelectTrigger className="w-56 rounded-xl"><SelectValue placeholder="กรองรอบอบรม" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกรอบอบรม</SelectItem>
                                        {schedules.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.courseTitle} ({s.startDate})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as DeliveryItemStatus | 'all')}>
                                    <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="กรองสถานะ" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกสถานะ</SelectItem>
                                        {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={courseFilter} onValueChange={setCourseFilter}>
                                    <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="กรองหลักสูตร" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.shortName || c.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                                    <Package className="w-12 h-12 opacity-20" />
                                    <p className="text-sm">ไม่มีรายการจัดส่ง</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>บริษัทผู้รับ</TableHead>
                                            <TableHead>หลักสูตร</TableHead>
                                            <TableHead>วันอบรม</TableHead>
                                            <TableHead>รายการ</TableHead>
                                            <TableHead>สถานะรวม</TableHead>
                                            <TableHead>เลขพัสดุ</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map(pkg => (
                                            <TableRow key={pkg.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30" onClick={() => setSelectedPkg(pkg)}>
                                                <TableCell className="font-medium">{pkg.clientCompanyName || pkg.recipientName || '-'}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{pkg.courseTitle}</TableCell>
                                                <TableCell className="text-sm">{formatDate(pkg.scheduleDate)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {pkg.items.map(item => (
                                                            <StatusBadge key={item.type} status={item.status} />
                                                        ))}
                                                        {pkg.items.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell><StatusBadge status={pkg.overallStatus} /></TableCell>
                                                <TableCell className="text-sm font-mono">{pkg.trackingNumber || '-'}</TableCell>
                                                <TableCell>
                                                    <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 px-3">จัดการ</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Grouped by schedule */}
                <TabsContent value="by-schedule" className="mt-6 space-y-4">
                    {groupedBySchedule.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <Package className="w-12 h-12 opacity-20" />
                            <p className="text-sm">ไม่มีรายการจัดส่ง</p>
                        </div>
                    ) : groupedBySchedule.map(({ scheduleId, schedule, packages: grpPkgs }) => {
                        const isExpanded = expandedSchedules.has(scheduleId);
                        const isBatching = batchingSchedule === scheduleId && isPending;
                        const completedCount = grpPkgs.filter(p => p.overallStatus === 'ได้รับแล้ว').length;

                        return (
                            <Card key={scheduleId} className="border-none shadow-sm rounded-3xl overflow-hidden">
                                <CardHeader className="cursor-pointer select-none" onClick={() => toggleSchedule(scheduleId)}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">
                                                {schedule?.courseTitle || 'หลักสูตรไม่พบ'}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {schedule ? formatDate(schedule.startDate) : scheduleId} · {grpPkgs.length} บริษัท · ได้รับแล้ว {completedCount}/{grpPkgs.length}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                onValueChange={(v) => { handleBatchUpdate(scheduleId, v as DeliveryItemStatus); }}
                                                disabled={isBatching}
                                            >
                                                <SelectTrigger
                                                    className="w-40 h-8 rounded-xl text-xs"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    {isBatching
                                                        ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />กำลังอัปเดต...</>
                                                        : <><PackageCheck className="h-3 w-3 mr-1" />อัปเดตทั้งรอบ</>
                                                    }
                                                </SelectTrigger>
                                                <SelectContent onClick={e => e.stopPropagation()}>
                                                    {ALL_STATUSES.filter(s => s !== 'ไม่มี').map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                    </div>
                                </CardHeader>
                                {isExpanded && (
                                    <CardContent className="pt-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>บริษัท</TableHead>
                                                    <TableHead>รายการ</TableHead>
                                                    <TableHead>สถานะรวม</TableHead>
                                                    <TableHead>เลขพัสดุ</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {grpPkgs.map(pkg => (
                                                    <TableRow key={pkg.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30" onClick={() => setSelectedPkg(pkg)}>
                                                        <TableCell className="font-medium">{pkg.clientCompanyName || pkg.recipientName || '-'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {pkg.items.map(item => <StatusBadge key={item.type} status={item.status} />)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell><StatusBadge status={pkg.overallStatus} /></TableCell>
                                                        <TableCell className="text-sm font-mono">{pkg.trackingNumber || '-'}</TableCell>
                                                        <TableCell>
                                                            <Button size="sm" variant="ghost" className="rounded-lg text-xs h-8 px-3">จัดการ</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </TabsContent>
            </Tabs>

            {selectedPkg && (
                <DeliveryDetailDialog
                    pkg={selectedPkg}
                    open={!!selectedPkg}
                    onClose={() => setSelectedPkg(null)}
                    onUpdated={handleUpdated}
                    actorName={actorName}
                />
            )}
        </div>
    );
}
