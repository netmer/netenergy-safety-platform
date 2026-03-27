import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { EvaluationTemplate } from '@/lib/course-data';
import { EvalEditorClientPage } from './eval-editor-client-page';
import { unstable_noStore as noStore } from 'next/cache';

export default async function EvalEditorPage({
    params,
}: {
    params: Promise<{ evalId: string }>;
}) {
    noStore();
    const { evalId } = await params;

    const snap = await getDoc(doc(db, 'evaluationTemplates', evalId));
    if (!snap.exists()) notFound();

    const template = { id: snap.id, ...snap.data() } as EvaluationTemplate;

    return <EvalEditorClientPage template={template} />;
}
