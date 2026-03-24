
'use client';

import type { TrainingRecord, Course, TrainingSchedule, CertificateTemplate as TemplateType } from '@/lib/course-data';
import { CertificateTemplate } from '../certificate-template';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

export function CertificateClientPage({ record, course, schedule, template }: { record: TrainingRecord, course: Course, schedule: TrainingSchedule, template?: TemplateType | null }) {
    return (
        <div className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 print:p-0">
             <div className="max-w-4xl mx-auto mb-4 print:hidden">
                <div className="flex justify-between items-center">
                    <Button asChild variant="outline">
                        <Link href="/erp/certificate">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับไปหน้าจัดการใบประกาศ
                        </Link>
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        พิมพ์ / บันทึกเป็น PDF
                    </Button>
                </div>
            </div>
            <CertificateTemplate record={record} course={course} schedule={schedule} template={template}/>
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
