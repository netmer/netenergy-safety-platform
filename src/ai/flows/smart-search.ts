'use server';

/**
 * @fileOverview A smart search flow that understands user queries and searches across the entire site.
 *
 * - smartSearch - A function that handles the search process.
 * - SmartSearchInput - The input type for the smartSearch function.
 * - SmartSearchOutput - The return type for the smartSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Course, BlogPost } from '@/lib/course-data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// --- Schemas for Input and Output ---

const SmartSearchInputSchema = z.object({
  query: z.string().describe('The user\'s search query.'),
});
export type SmartSearchInput = z.infer<typeof SmartSearchInputSchema>;

const SearchResultItemSchema = z.object({
    title: z.string().describe('The title of the search result item.'),
    url: z.string().describe('The absolute URL for the item.'),
    reason: z.string().describe('A brief, compelling reason in Thai explaining why this item is a good match for the user\'s query.'),
});

const SmartSearchOutputSchema = z.object({
    courses: z.array(SearchResultItemSchema).describe('A list of relevant training courses.'),
    blogs: z.array(SearchResultItemSchema).describe('A list of relevant blog posts or articles.'),
    pages: z.array(SearchResultItemSchema).describe('A list of other relevant pages like "About Us" or "Contact".'),
});
export type SmartSearchOutput = z.infer<typeof SmartSearchOutputSchema>;


// --- Exported Search Function ---

export async function smartSearch(input: SmartSearchInput): Promise<SmartSearchOutput> {
  return smartSearchFlow(input);
}

// --- Internal Prompt and Flow Definition ---

const PromptInputSchema = SmartSearchInputSchema.extend({
    courseList: z.string().describe('A stringified list of available courses.'),
    blogList: z.string().describe('A stringified list of available blog posts.'),
    staticPages: z.string().describe('A stringified list of available static pages.'),
});

const smartSearchPrompt = ai.definePrompt({
  name: 'smartSearchPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: SmartSearchOutputSchema},
  prompt: `You are an intelligent and helpful search assistant for the NET Safety Training website. Your goal is to understand the user's query and provide the most relevant links from the website's content.

Analyze the user's query: "{{query}}"

Consider the user's intent. Are they looking for a specific course? Information on a topic? Or trying to navigate to a specific page?

Based on the query, find the most relevant items from the lists below. For each item you select, provide a short, compelling reason (in Thai) why it's a good match.

**Available Courses:**
{{{courseList}}}

**Available Blog Posts:**
{{{blogList}}}

**Other Website Pages:**
{{{staticPages}}}

Return your findings in the structured JSON format. Do not return more than 5 items per category. If no relevant items are found in a category, return an empty array for it.`,
});

const smartSearchFlow = ai.defineFlow(
  {
    name: 'smartSearchFlow',
    inputSchema: SmartSearchInputSchema,
    outputSchema: SmartSearchOutputSchema,
  },
  async (input) => {
    // 1. Fetch all content from Firestore
    const coursesQuery = query(collection(db, 'courses'), orderBy('title'));
    const coursesSnapshot = await getDocs(coursesQuery);
    const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

    const blogsQuery = query(collection(db, 'blogPosts'), orderBy('date', 'desc'));
    const blogsSnapshot = await getDocs(blogsQuery);
    const blogs = blogsSnapshot.docs.map(doc => ({ slug: doc.id, ...doc.data() } as BlogPost));
    
    // Hardcoded list of static pages
    const staticPages = [
        { title: 'หน้าแรก', url: '/', description: 'หน้าหลักของเว็บไซต์ NET' },
        { title: 'เกี่ยวกับเรา', url: '/about', description: 'ข้อมูลเกี่ยวกับบริษัท NET, ภารกิจ และสิ่งที่เรายึดมั่น' },
        { title: 'หลักสูตรทั้งหมด', url: '/courses', description: 'ภาพรวมหมวดหมู่หลักสูตรอบรมทั้งหมด' },
        { title: 'งานตรวจสอบและที่ปรึกษา', url: '/consulting', description: 'บริการให้คำปรึกษาและตรวจสอบความปลอดภัย' },
        { title: 'ประวัติการอบรม', url: '/training-history', description: 'ตรวจสอบประวัติผู้ที่ผ่านการอบรมหลักสูตรต่างๆ' },
        { title: 'ติดต่อเรา', url: '/contact', description: 'ข้อมูลการติดต่อ, ที่อยู่, และแบบฟอร์มสำหรับส่งข้อความ' },
        { title: 'AI แนะนำหลักสูตร', url: '/compliance-checker', description: 'เครื่องมือ AI ช่วยแนะนำหลักสูตรที่จำเป็นสำหรับองค์กร' },
    ];

    // 2. Format the content for the prompt
    const courseListForPrompt = courses.map(c => `ID: ${c.id}, Title: ${c.shortName || c.title}, Description: ${c.description}, Tags: ${c.tags?.join(', ')}`).join('\n');
    const blogListForPrompt = blogs.map(b => `Slug: ${b.slug}, Title: ${b.title}, Excerpt: ${b.excerpt}, Category: ${b.category}`).join('\n');
    const staticPagesForPrompt = staticPages.map(p => `URL: ${p.url}, Title: ${p.title}, Description: ${p.description}`).join('\n');
    
    // 3. Call the AI prompt
    const {output} = await smartSearchPrompt({
        ...input,
        courseList: courseListForPrompt,
        blogList: blogListForPrompt,
        staticPages: staticPagesForPrompt,
    });
    
    return output!;
  }
);
