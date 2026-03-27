import { notFound } from 'next/navigation';
import { getExamTemplate } from '@/app/erp/exams/actions';
import { ExamEditorClientPage } from '@/app/erp/exams/[examId]/exam-editor-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function AdminExamEditorPage({ params }: { params: Promise<{ examId: string }> }) {
    noStore();
    const { examId } = await params;
    const template = await getExamTemplate(examId);
    if (!template) notFound();
    return <ExamEditorClientPage template={template} backHref="/admin/exams" />;
}
