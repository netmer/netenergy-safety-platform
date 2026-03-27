import type { EvaluationTemplate, EvaluationSection } from './course-data';
import { nanoid } from 'nanoid';

export function calculateEvaluationAverages(
    template: EvaluationTemplate,
    ratings: Record<string, number>,
): { averageScore: number; sectionAverages: Record<string, number> } {
    const sectionAverages: Record<string, number> = {};
    let totalSum = 0;
    let totalCount = 0;

    for (const section of template.sections) {
        const values = section.items
            .map(item => ratings[item.id])
            .filter((v): v is number => typeof v === 'number' && v >= 1 && v <= 10);
        if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            sectionAverages[section.id] = Math.round(avg * 100) / 100;
            totalSum += values.reduce((a, b) => a + b, 0);
            totalCount += values.length;
        }
    }

    const averageScore = totalCount > 0
        ? Math.round((totalSum / totalCount) * 100) / 100
        : 0;

    return { averageScore, sectionAverages };
}

// ── Default template factory ──────────────────────────────────────────────────

export function makeDefaultEvaluationTemplate(
    courseId: string,
    courseTitle: string,
    createdBy: string,
): Omit<EvaluationTemplate, 'id'> {
    const now = new Date().toISOString();
    return {
        name: `แบบประเมิน — ${courseTitle}`,
        courseId,
        courseTitle,
        sections: makeDefaultSections(),
        openQuestions: makeDefaultOpenQuestions(),
        createdAt: now,
        updatedAt: now,
        createdBy,
    };
}

function makeDefaultSections(): EvaluationSection[] {
    return [
        {
            id: nanoid(),
            title: 'ด้านเนื้อหาหลักสูตร',
            items: [
                { id: nanoid(), label: 'ความเหมาะสมของเนื้อหาหลักสูตร' },
                { id: nanoid(), label: 'ความทันสมัยและเป็นประโยชน์ของเนื้อหา' },
                { id: nanoid(), label: 'การนำความรู้ไปใช้ประโยชน์ได้จริง' },
            ],
        },
        {
            id: nanoid(),
            title: 'ด้านวิทยากร',
            items: [
                { id: nanoid(), label: 'ความรู้ความสามารถของวิทยากร' },
                { id: nanoid(), label: 'ความชัดเจนในการถ่ายทอดความรู้' },
                { id: nanoid(), label: 'การตอบข้อซักถามและการมีส่วนร่วม' },
            ],
        },
        {
            id: nanoid(),
            title: 'ด้านการจัดอบรม',
            items: [
                { id: nanoid(), label: 'ความเหมาะสมของสถานที่และสิ่งอำนวยความสะดวก' },
                { id: nanoid(), label: 'ความเหมาะสมของระยะเวลาการอบรม' },
                { id: nanoid(), label: 'ความเหมาะสมของสื่อและอุปกรณ์การสอน' },
            ],
        },
    ];
}

function makeDefaultOpenQuestions() {
    return [
        { id: nanoid(), label: 'ประเด็นที่ได้รับประโยชน์มากที่สุดจากการอบรม', required: true },
        { id: nanoid(), label: 'ข้อเสนอแนะสำหรับการปรับปรุงในครั้งต่อไป', required: false },
    ];
}

// ── Score → emotion label ─────────────────────────────────────────────────────

export function getScoreLabel(score: number): string {
    if (score <= 4) return 'ต้องปรับปรุง';
    if (score <= 7) return 'พอใจปานกลาง';
    if (score <= 9) return 'พอใจมาก';
    return 'พอใจมากที่สุด';
}

export function getScoreColor(score: number): string {
    if (score <= 4) return '#f87171'; // red-400
    if (score <= 7) return '#facc15'; // yellow-400
    if (score <= 9) return '#4ade80'; // green-400
    return '#10b981';                 // emerald-500
}

export function getScoreTier(score: number): 'crying' | 'neutral' | 'happy' | 'ecstatic' {
    if (score <= 4) return 'crying';
    if (score <= 7) return 'neutral';
    if (score <= 9) return 'happy';
    return 'ecstatic';
}
