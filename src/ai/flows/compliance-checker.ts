'use server';

/**
 * @fileOverview The compliance checker tool flow, which recommends mandatory safety training courses for an organization.
 *
 * - complianceChecker - A function that handles the compliance checking process.
 * - ComplianceCheckerInput - The input type for the complianceChecker function.
 * - ComplianceCheckerOutput - The return type for the complianceChecker function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Course } from '@/lib/course-data';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';


const ComplianceCheckerInputSchema = z.object({
  businessType: z.string().describe('The type of business or industry.'),
  employeeCount: z.number().describe('The number of employees in the organization.'),
  location: z.string().describe('The location of the business.'),
  otherFactors: z.string().optional().describe('Any other relevant factors.'),
});
export type ComplianceCheckerInput = z.infer<typeof ComplianceCheckerInputSchema>;

const ComplianceCheckerOutputSchema = z.object({
  requiredCourses: z.array(
    z.object({
      courseId: z.string().describe('รหัสอ้างอิง (ID) ของหลักสูตรจากรายการที่มีให้ (สำหรับระบบหลังบ้าน)'),
      courseName: z.string().describe('ชื่อเต็มของหลักสูตรที่แนะนำ (สำหรับแสดงผล)'),
    })
  ).describe('รายชื่อหลักสูตรที่แนะนำสำหรับองค์กร'),
  summary: z.string().describe('สรุปเหตุผลที่แนะนำหลักสูตรเหล่านี้ โดยต้องไม่มีการอ้างอิงถึง ID ของหลักสูตร และปิดท้ายด้วยข้อความหมายเหตุ'),
});
export type ComplianceCheckerOutput = z.infer<typeof ComplianceCheckerOutputSchema>;

export async function complianceChecker(input: ComplianceCheckerInput): Promise<ComplianceCheckerOutput> {
  return complianceCheckerFlow(input);
}

const PromptInputSchema = ComplianceCheckerInputSchema.extend({
    courseList: z.string(),
});

const complianceCheckerPrompt = ai.definePrompt({
  name: 'complianceCheckerPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: ComplianceCheckerOutputSchema},
  prompt: `คุณคือ AI ที่ปรึกษาด้านการอบรมความปลอดภัยและความปลอดภัยในการทำงานระดับสูง มีความเชี่ยวชาญในกฎหมายแรงงานและมาตรฐานความปลอดภัยของประเทศไทยอย่างลึกซึ้ง

**ภารกิจของคุณ:**
วิเคราะห์ข้อมูลขององค์กรที่ให้มาอย่างละเอียด และให้คำแนะนำหลักสูตรอบรมที่ **เหมาะสมและเป็นประโยชน์สูงสุด** โดยอ้างอิงจากข้อมูลหลักสูตรที่เกี่ยวข้องซึ่งมีในระบบ

**ข้อมูลองค์กรเพื่อการวิเคราะห์:**
- ประเภทธุรกิจ: {{{businessType}}}
- จำนวนพนักงาน: {{{employeeCount}}}
- ที่ตั้ง: {{{location}}}
- ลักษณะงานและปัจจัยเสี่ยงเพิ่มเติม: {{{otherFactors}}}

**หลักการในการวิเคราะห์:**
1.  **วิเคราะห์ความเกี่ยวข้อง:** ให้ความสำคัญกับหลักสูตรทั่วไปก่อนเสมอ **ห้ามแนะนำหลักสูตรที่เจาะจงสำหรับลูกค้าเฉพาะราย (เช่น หลักสูตรสำหรับผู้รับเหมา AIS, Lotus) โดยเด็ดขาด** เว้นแต่ว่าผู้ใช้ได้ระบุข้อมูลที่เกี่ยวข้องกับลูกค้ารายนั้นๆ ไว้อย่างชัดเจนใน "ประเภทธุรกิจหรือลักษณะงานและปัจจัยเสี่ยงเพิ่มเติม"
2.  **พิจารณาจากกฎหมาย:** ให้ความสำคัญสูงสุดกับหลักสูตรที่เป็นข้อบังคับทางกฎหมาย โดยอิงจากประเภทธุรกิจ, จำนวนพนักงาน, และลักษณะงาน
3.  **พิจารณาจากความเสี่ยง:** วิเคราะห์ข้อมูลใน "ลักษณะงานและปัจจัยเสี่ยงเพิ่มเติม" เพื่อแนะนำหลักสูตรที่ช่วยลดความเสี่ยงเฉพาะทาง เช่น หากมีการทำงานกับสารเคมี, ที่สูง, หรือเครื่องจักรหนัก ให้แนะนำหลักสูตรที่เกี่ยวข้อง
4.  **พิจารณาจากประโยชน์โดยรวม:** แนะนำหลักสูตรที่ช่วยพัฒนาทักษะและความปลอดภัยโดยรวม แม้จะไม่ใช่ข้อบังคับทางกฎหมาย แต่เป็นประโยชน์ต่อองค์กร
5.  **จับคู่ข้อมูล:** ใช้ข้อมูล "คำอธิบาย", "วัตถุประสงค์", และ "คุณสมบัติผู้เข้าอบรม" จากรายการหลักสูตรด้านล่าง เพื่อหาหลักสูตรที่ตรงกับความต้องการขององค์กรมากที่สุด

**รายการหลักสูตรที่เกี่ยวข้องสำหรับใช้วิเคราะห์ (ห้ามแนะนำหลักสูตรนอกเหนือจากนี้):**
{{{courseList}}}

**รูปแบบการตอบกลับ (สำคัญมาก):**
- \`requiredCourses\`: อาร์เรย์ของอ็อบเจ็กต์ที่มี \`courseId\` และ \`courseName\` ของหลักสูตรที่แนะนำ
- \`summary\`: สรุปเหตุผลที่ชัดเจนและเป็นประโยชน์ว่าทำไมจึงแนะนำหลักสูตรเหล่านี้ โดยอ้างอิงจากข้อมูลที่ผู้ใช้ให้มา **ในส่วนนี้ให้ใช้ชื่อหลักสูตรเต็มในการอธิบาย และห้ามกล่าวถึง ID ของหลักสูตรโดยเด็ดขาด** สุดท้าย ต้องปิดท้ายด้วยข้อความหมายเหตุนี้ทุกครั้ง:
"**หมายเหตุ:** เป็นการแนะนำจากระบบ AI กรุณาติดต่อสอบถามทีมงานเพื่อข้อมูลที่ถูกต้องอีกครั้ง"

หากไม่พบหลักสูตรที่ตรงกับข้อมูลที่ให้มา ให้ส่งคืน \`requiredCourses\` เป็นรายการว่าง และใน \`summary\` ให้อธิบายว่าไม่พบหลักสูตรที่แนะนำเป็นพิเศษจากข้อมูลดังกล่าว และยังคงต้องปิดท้ายด้วยข้อความหมายเหตุเหมือนเดิม
  `,
});

const complianceCheckerFlow = ai.defineFlow(
  {
    name: 'complianceCheckerFlow',
    inputSchema: ComplianceCheckerInputSchema,
    outputSchema: ComplianceCheckerOutputSchema,
  },
  async (input) => {
    const coursesCollection = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesCollection);
    const allCourses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    
    // Pre-filtering logic to remove irrelevant client-specific courses
    const clientSpecificKeywords = ['AIS', 'LOTUS', 'TRUE']; // Keywords for client-specific courses
    const userText = `${input.businessType} ${input.otherFactors || ''}`.toUpperCase();
    
    const userMentionsClient = clientSpecificKeywords.some(keyword => userText.includes(keyword));

    const filteredCourses = allCourses.filter(course => {
      const courseTitleUpper = course.title.toUpperCase();
      const isClientSpecific = clientSpecificKeywords.some(keyword => courseTitleUpper.includes(keyword));
      
      // If the course is client-specific, only include it if the user mentioned that client.
      if (isClientSpecific) {
        // Check if user input mentions the specific client associated with the course
        return clientSpecificKeywords.some(keyword => courseTitleUpper.includes(keyword) && userText.includes(keyword));
      }
      
      // Otherwise, it's a general course, so always include it.
      return true;
    });

    // Create a detailed string for each course from the filtered list
    const courseListForPrompt = filteredCourses.map(c => {
      return `
### Course Profile
ID: ${c.id}
ชื่อหลักสูตร: ${c.title}
คำอธิบาย: ${c.description}
Tags: ${c.tags?.join(', ') || 'ไม่มี'}
วัตถุประสงค์: 
${c.objectives?.map(o => `- ${o}`).join('\n') || 'ไม่มีข้อมูล'}
คุณสมบัติผู้เข้าอบรม: 
${c.qualifications?.map(q => `- ${q}`).join('\n') || 'ไม่มีข้อมูล'}
      `.trim();
    }).join('\n\n---\n\n');

    const {output} = await complianceCheckerPrompt({...input, courseList: courseListForPrompt});
    return output!;
  }
);
