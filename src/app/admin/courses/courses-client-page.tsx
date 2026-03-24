

'use client';

import { useState } from 'react';
import type { Course, CourseCategory, CourseType, RegistrationForm, CertificateTemplate } from '@/lib/course-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoursesTab } from './courses-tab';
import { CategoriesTab } from './categories-tab';
import { TypesTab } from './types-tab';

// --- Main Page Component ---
export function CoursesClientPage({ courses, categories, types, forms, certificateTemplates }: { courses: Course[], categories: CourseCategory[], types: CourseType[], forms: RegistrationForm[], certificateTemplates: CertificateTemplate[] }) {
    return (
        <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="courses">จัดการหลักสูตร</TabsTrigger>
                <TabsTrigger value="categories">จัดการหมวดหมู่</TabsTrigger>
                <TabsTrigger value="types">จัดการประเภท</TabsTrigger>
            </TabsList>
            <TabsContent value="courses">
                <CoursesTab courses={courses} categories={categories} types={types} forms={forms} certificateTemplates={certificateTemplates}/>
            </TabsContent>
            <TabsContent value="categories">
                <CategoriesTab categories={categories} />
            </TabsContent>
            <TabsContent value="types">
                <TypesTab types={types} />
            </TabsContent>
        </Tabs>
    );
}
