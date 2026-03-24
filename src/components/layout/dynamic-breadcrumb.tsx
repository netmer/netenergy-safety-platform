'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

const pathTranslations: Record<string, string> = {
    'erp': 'ERP Dashboard',
    'schedule': 'จัดการตารางอบรม',
    'registrations': 'ข้อมูลการลงทะเบียน',
    'attendees': 'จัดการข้อมูลผู้อบรม',
    'billing': 'การเงินและบัญชี',
    'history': 'ประวัติการอบรม',
    'certificate': 'พิมพ์ใบประกาศ',
    'admin': 'Admin Panel',
    'analytics': 'การวิเคราะห์',
    'courses': 'จัดการหลักสูตร',
    'users': 'จัดการผู้ใช้',
    'instructors': 'จัดการวิทยากร',
    'forms': 'จัดการแบบฟอร์ม',
    'templates': 'แม่แบบเอกสาร',
    'certifications': 'ใบรับรองศูนย์',
    'clients': 'จัดการลูกค้าองค์กร',
    'content': 'จัดการเนื้อหาเว็บ',
    'edit': 'แก้ไขข้อมูล',
};

export function DynamicBreadcrumb() {
    const pathname = usePathname();
    const paths = pathname.split('/').filter(Boolean);

    return (
        <div className="hidden sm:flex items-center space-x-1.5 text-sm font-medium text-muted-foreground mr-auto bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800">
            <Link href="/" className="hover:text-blue-600 transition-colors">
                <Home className="w-3.5 h-3.5" />
            </Link>
            
            {paths.map((path, index) => {
                const isLast = index === paths.length - 1;
                const translatedPath = pathTranslations[path] || path;
                const href = '/' + paths.slice(0, index + 1).join('/');

                if (path === 'edit' && !isLast) {
                    // Skip 'edit' if it's not the last path
                    return null;
                }
                
                // Truncate long IDs
                const displayPath = translatedPath.length > 20 && !pathTranslations[path] 
                    ? `#${translatedPath.slice(0, 8)}...` 
                    : translatedPath;

                return (
                    <React.Fragment key={path}>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        {isLast ? (
                            <span className="text-foreground font-semibold px-1 shrink-0">{displayPath}</span>
                        ) : (
                            <Link href={href} className="hover:text-blue-600 transition-colors shrink-0">
                                {displayPath}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

