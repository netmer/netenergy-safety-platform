import { notFound } from 'next/navigation';
import { getExamTemplate } from '../actions';
import { ExamEditorClientPage } from './exam-editor-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ExamEditorPage({ params }: { params: Promise<{ examId: string }> }) {
    noStore();
    const { examId } = await params;
    const template = await getExamTemplate(examId);
    if (!template) notFound();
    return <ExamEditorClientPage template={template} />;
}
