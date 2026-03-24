
'use client';

import type { TrainingRecord, Course, CertificateTemplate as TemplateType, TrainingSchedule } from '@/lib/course-data';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import Image from 'next/image';

interface CertificateTemplateProps {
    record: TrainingRecord;
    course: Course;
    schedule: TrainingSchedule;
    template?: TemplateType | null;
}

export function CertificateTemplate({ record, course, schedule, template }: CertificateTemplateProps) {
    // Use completionDate as the primary date. Fallback to issueDate.
    const completionDate = record.completionDate 
        ? new Date(record.completionDate)
        : (record.certificateIssueDate ? new Date(record.certificateIssueDate) : new Date());

    // Formatting date to Thai Buddhist Era
    const formattedCompletionDate = format(completionDate, 'd MMMM yyyy', { locale: th });
    
    // Use the specific template background or a default one
    const backgroundImageUrl = template?.backgroundImageUrl || "https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/certificate-templates%2Fdefault-template.jpg?alt=media&token=c1e309a9-4562-42c2-9010-0937c569a9b7";
    
    return (
         <div 
            className="aspect-[297/210] w-full bg-white shadow-lg relative font-body text-black flex flex-col bg-cover bg-center bg-no-repeat p-10 md:p-14"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        >
            <div className="relative z-10 flex-grow flex flex-col items-center w-full text-center">
                
                {/* Certificate ID */}
                <div className="absolute top-0 right-0 text-[10px] md:text-xs">
                    เลขที่ {record.certificateId}
                </div>

                {/* Header */}
                <div className="w-full space-y-1">
                     <Image
                        src="https://firebasestorage.googleapis.com/v0/b/netenergy-safety-platform.firebasestorage.app/o/Logo.jpg?alt=media&token=3f660eec-b17e-459d-9320-7014e719466e"
                        alt="NET Logo"
                        width={120}
                        height={40}
                        className="h-8 md:h-10 w-auto mx-auto"
                    />
                    <h1 className="text-2xl md:text-3xl font-bold tracking-wider">
                        หนังสือรับรอง
                    </h1>
                    <h2 className="text-base md:text-lg font-semibold">
                        บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด
                    </h2>
                </div>
                
                {/* Main Content */}
                <div className="flex-grow flex flex-col justify-center items-center w-full space-y-2 md:space-y-4">
                    <p className="text-sm md:text-base">
                        หนังสือฉบับนี้ให้ไว้เพื่อแสดงว่า
                    </p>
                    <h3 className="font-art text-4xl md:text-5xl font-bold text-amber-700">
                        {record.attendeeName}
                    </h3>
                    <div className="max-w-2xl text-sm md:text-base">
                         <p>
                            ได้ผ่านการฝึกอบรม เรื่อง
                        </p>
                         <p className="font-bold text-base md:text-xl leading-relaxed mt-1">
                            {course.title}
                        </p>
                    </div>
                    <p className="text-sm md:text-base">
                        อบรมวันที่ {formattedCompletionDate}
                    </p>
                </div>


                {/* Footer Signatures */}
                <div className="w-full flex justify-between items-end pt-4 mt-auto">
                    <div className="text-center text-xs md:text-sm">
                        <div className="w-40 md:w-48 border-b border-dotted border-gray-500 mx-auto mb-1"></div>
                        <p className="font-semibold">น.ส.ธิดาทิพย์ จำปาแดง</p>
                        <p>ผู้อำนวยการศูนย์ฝึกอบรม</p>
                    </div>
                     <div className="text-center text-xs md:text-sm">
                        <div className="w-40 md:w-48 border-b border-dotted border-gray-500 mx-auto mb-1"></div>
                        <p className="font-semibold">{schedule.instructorName || 'นายศุภวัตต์ เบ็ญจหงษ์'}</p>
                        <p>วิทยากร</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
