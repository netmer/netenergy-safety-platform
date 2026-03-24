'use client';

import React, { useState, useMemo, useTransition } from 'react';
import type { Registration, Course } from '@/lib/course-data';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateQuotationAction, generateInvoiceAction } from './actions';
import { Loader2, FileText, FileSignature, Search, Building, ExternalLink } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BillingClientPageProps {
    initialRegistrations: Registration[];
    courses: Course[];
}

export function BillingClientPage({ initialRegistrations, courses }: BillingClientPageProps) {
    const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
    const [isPending, startTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    const handleGenerate = (action: (id: string) => Promise<any>, registrationId: string, type: 'quotation' | 'invoice') => {
        setProcessingId(registrationId);
        startTransition(async () => {
            try {
                const result = await action(registrationId);
                if (result.success) {
                    toast({ title: 'สำเร็จ', description: result.message });
                    setRegistrations(prev => prev.map(r => {
                        if (r.id === registrationId) {
                            return { 
                                ...r, 
                                [`${type}Generated`]: true,
                                [`${type}Url`]: result.publicUrl
                            };
                        }
                        return r;
                    }));
                } else {
                    toast({ variant: 'destructive', title: 'การเชื่อมต่อ API ผิดพลาด', description: result.message });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: error instanceof Error ? error.message : 'กรุณาตรวจสอบการตั้งค่า API' });
            } finally {
                setProcessingId(null);
            }
        });
    };
    
    const filteredRegistrations = useMemo(() => {
        return registrations.filter(reg => {
            const matchesCourse = courseFilter === 'all' || reg.courseId === courseFilter;
            
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch = !debouncedSearch ||
                (reg.clientCompanyName && reg.clientCompanyName.toLowerCase().includes(searchLower)) ||
                reg.courseTitle.toLowerCase().includes(searchLower);

            return matchesCourse && matchesSearch;
        });
    }, [registrations, debouncedSearch, courseFilter]);

    return (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-8">
                <CardTitle className="text-2xl font-bold font-headline">ศูนย์กลางการเงินและบัญชี</CardTitle>
                <CardDescription>จัดการใบเสนอราคาและใบแจ้งหนี้สำหรับรายการลงทะเบียนที่ยืนยันแล้ว</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ค้นหาชื่อบริษัท..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 rounded-xl"
                        />
                    </div>
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                        <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="กรองตามหลักสูตร" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                            {courses.map(course => (
                                <SelectItem key={course.id} value={course.id}>{course.shortName || course.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/20">
                            <TableRow>
                                <TableHead className="font-bold py-4">บริษัท / ผู้ติดต่อ</TableHead>
                                <TableHead className="font-bold">หลักสูตร</TableHead>
                                <TableHead className="font-bold">สถานะเอกสาร</TableHead>
                                <TableHead className="text-right font-bold pr-6">ดำเนินการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRegistrations.length > 0 ? filteredRegistrations.map((reg) => {
                                const isProcessing = processingId === reg.id;
                                return (
                                    <TableRow key={reg.id} className="hover:bg-muted/5">
                                        <TableCell className="py-6">
                                            <div className="font-bold text-slate-900 dark:text-white">{reg.clientCompanyName || 'ข้อมูลส่วนบุคคล'}</div>
                                            <div className="text-xs text-muted-foreground">{reg.formData?.coordinator?.name || reg.userDisplayName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-xs truncate text-sm" title={coursesMap.get(reg.courseId)?.title}>
                                                {coursesMap.get(reg.courseId)?.shortName || reg.courseTitle}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={reg.quotationGenerated ? "secondary" : "outline"} className={cn("text-[9px] font-bold tracking-widest", reg.quotationGenerated ? "bg-blue-100 text-blue-800 border-blue-200" : "opacity-40")}>
                                                        QUOTATION
                                                    </Badge>
                                                    {reg.quotationUrl && <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={reg.quotationUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5"/></a></Button>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={reg.invoiceGenerated ? "secondary" : "outline"} className={cn("text-[9px] font-bold tracking-widest", reg.invoiceGenerated ? "bg-green-100 text-green-800 border-green-200" : "opacity-40")}>
                                                        INVOICE
                                                    </Badge>
                                                    {reg.invoiceUrl && <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={reg.invoiceUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5"/></a></Button>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleGenerate(generateQuotationAction, reg.id, 'quotation')}
                                                    disabled={isProcessing}
                                                    className="rounded-xl h-9 font-semibold"
                                                >
                                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                                    {reg.quotationGenerated ? 'ออกใหม่' : 'สร้างใบเสนอราคา'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleGenerate(generateInvoiceAction, reg.id, 'invoice')}
                                                    disabled={isProcessing}
                                                    className="rounded-xl h-9 font-semibold"
                                                >
                                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                                                    {reg.invoiceGenerated ? 'ออกใหม่' : 'สร้างใบแจ้งหนี้'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic font-light">
                                        ไม่พบรายการที่ตรงกับเงื่อนไข
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
