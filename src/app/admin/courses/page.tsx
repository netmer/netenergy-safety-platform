import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Course, CourseCategory, CourseType, RegistrationForm, CertificateTemplate } from '@/lib/course-data';
import { CoursesClientPage } from './courses-client-page';

// บังคับให้เป็น Dynamic Rendering เพื่อป้องกันปัญหาการ Prerender ข้อมูลที่ยังไม่พร้อม
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ManageCoursesPage() {
  try {
    const [coursesSnapshot, categoriesSnapshot, typesSnapshot, formsSnapshot, templatesSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'courses'), orderBy('title'))),
      getDocs(query(collection(db, 'courseCategories'), orderBy('title'))),
      getDocs(query(collection(db, 'courseTypes'), orderBy('name'))),
      getDocs(query(collection(db, 'registrationForms'), orderBy('name'))),
      getDocs(query(collection(db, 'certificateTemplates'), orderBy('name'))),
    ]);

    // การ Mapping ข้อมูลอย่างเข้มงวด (Strict Explicit Mapping)
    // เพื่อป้องกันไม่ให้ค่า undefined หรือโครงสร้างข้อมูล Firestore หลุดไปยัง Client
    const courses = coursesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure type is always an array
      let courseTypes: string[] = [];
      if (Array.isArray(data.type)) {
        courseTypes = data.type.map((t: any) => String(t));
      } else if (typeof data.type === 'string' && data.type !== 'none' && data.type !== '') {
        courseTypes = [data.type];
      }

      return {
        id: String(doc.id),
        title: String(data.title || ''),
        shortName: String(data.shortName || ''),
        description: String(data.description || ''),
        categoryId: String(data.categoryId || ''),
        type: courseTypes, // Always an array now
        tags: Array.isArray(data.tags) ? data.tags.map((t: any) => String(t)) : [],
        orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        image: String(data.image || ''),
        hint: String(data.hint || ''),
        price: String(data.price || ''),
        validityYears: typeof data.validityYears === 'number' ? data.validityYears : null,
        registrationFormId: data.registrationFormId ? String(data.registrationFormId) : null,
        certificateTemplateId: data.certificateTemplateId ? String(data.certificateTemplateId) : null,
        objectives: Array.isArray(data.objectives) ? data.objectives.map((o: any) => String(o)) : [],
        topics: Array.isArray(data.topics) ? data.topics.map((t: any) => String(t)) : [],
        agenda: Array.isArray(data.agenda) ? data.agenda.map((a: any) => String(a)) : [],
        benefits: Array.isArray(data.benefits) ? data.benefits.map((b: any) => String(b)) : [],
        qualifications: Array.isArray(data.qualifications) ? data.qualifications.map((q: any) => String(q)) : [],
      };
    });

    const categories = categoriesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: String(doc.id),
        title: String(data.title || ''),
        description: String(data.description || ''),
        image: String(data.image || ''),
        hint: String(data.hint || ''),
        orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        parentId: data.parentId ? String(data.parentId) : null,
      };
    });

    const types = typesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: String(doc.id),
        name: String(data.name || ''),
      };
    });

    const forms = formsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: String(doc.id),
        name: String(data.name || ''),
        description: String(data.description || ''),
        fields: Array.isArray(data.fields) ? JSON.parse(JSON.stringify(data.fields)) : [],
      };
    });

    const certificateTemplates = templatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: String(doc.id),
        name: String(data.name || ''),
        backgroundImageUrl: String(data.backgroundImageUrl || ''),
        hint: String(data.hint || ''),
      };
    });

    // ทำการ Serialize ข้อมูลทั้งหมดเป็น Plain Object อย่างสมบูรณ์ก่อนส่งไป Client
    const cleanData = JSON.parse(JSON.stringify({
      courses,
      categories,
      types,
      forms,
      certificateTemplates
    }));

    return (
      <CoursesClientPage 
        courses={cleanData.courses} 
        categories={cleanData.categories} 
        types={cleanData.types} 
        forms={cleanData.forms} 
        certificateTemplates={cleanData.certificateTemplates}
      />
    );
  } catch (error) {
    console.error("Failed to load courses management data:", error);
    return (
      <div className="p-8 text-center bg-destructive/10 rounded-xl m-4 border border-destructive/20">
        <h1 className="text-2xl font-bold text-destructive">เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ</h1>
        <p className="text-muted-foreground mt-2">โปรดลองรีเฟรชหน้าจออีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่</p>
      </div>
    );
  }
}
