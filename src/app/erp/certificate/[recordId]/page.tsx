'use client';

import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { TrainingRecord, Course, CertificateTemplate as TemplateType, TrainingSchedule } from '@/lib/course-data';
import { CertificateTemplate } from '../certificate-template';
import { useEffect, useState, use } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CertificateClientPage } from './certificate-client-page';


type CertificateData = {
    record: TrainingRecord;
    course: Course;
    schedule: TrainingSchedule;
    template: TemplateType | null;
};

async function getCertificateData(recordId: string): Promise<CertificateData | null> {
    const recordDoc = await getDoc(doc(db, 'trainingRecords', recordId));
    if (!recordDoc.exists() || recordDoc.data().status !== 'completed') {
        return null;
    }
    const record = { id: recordDoc.id, ...recordDoc.data() } as TrainingRecord;

    const courseDoc = await getDoc(doc(db, 'courses', record.courseId));
    if (!courseDoc.exists()) {
        return null;
    }
    const course = { id: courseDoc.id, ...courseDoc.data() } as Course;
    
    const scheduleDoc = await getDoc(doc(db, 'trainingSchedules', record.scheduleId));
    if (!scheduleDoc.exists()) {
        return null;
    }
    const schedule = { id: scheduleDoc.id, ...scheduleDoc.data() } as TrainingSchedule;

    let template: TemplateType | null = null;
    if (course.certificateTemplateId) {
        const templateDoc = await getDoc(doc(db, 'certificateTemplates', course.certificateTemplateId));
        if (templateDoc.exists()) {
            template = { id: templateDoc.id, ...templateDoc.data() } as TemplateType;
        }
    }

    return { record, course, schedule, template };
}


export default function CertificatePrintPage({ params }: { params: Promise<{ recordId: string }> }) {
    const { recordId } = use(params);
    const [data, setData] = useState<CertificateData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const result = await getCertificateData(recordId);
            setData(result);
            setLoading(false);
        };
        fetchData();
    }, [recordId]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4">กำลังโหลดข้อมูลใบประกาศ...</p>
            </div>
        );
    }
    
    if (!data) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-center">
                <div>
                    <h1 className="text-2xl font-bold">ไม่พบใบประกาศ</h1>
                    <p className="text-muted-foreground mt-2">ไม่พบข้อมูลใบประกาศนียบัตรสำหรับ ID นี้ หรือยังไม่ผ่านการอบรม</p>
                     <Button asChild variant="outline" className="mt-4">
                        <Link href="/erp/certificate">
                           กลับไปที่หน้าค้นหา
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <CertificateClientPage
            record={data.record}
            course={data.course}
            schedule={data.schedule}
            template={data.template}
        />
    );
}
