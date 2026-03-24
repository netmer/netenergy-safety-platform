
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { CourseCategory } from '@/lib/course-data';
import CourseCategoriesClient from './course-categories-client';

export const metadata = {
    title: 'หมวดหมู่หลักสูตรทั้งหมด | NET Safety Platform',
    description: 'ค้นหาหลักสูตรอบรมความปลอดภัยที่เหมาะกับคุณ แยกตามหมวดหมู่มาตรฐานสากล',
};

export default async function CoursesCategoriesPage() {
  const categoriesQuery = query(collection(db, 'courseCategories'), orderBy('orderIndex'));
  const categoriesSnapshot = await getDocs(categoriesQuery);
  
  // ดึงข้อมูลทั้งหมดและทำการกรองในฝั่ง Server
  // กรองเฉพาะหมวดหมู่ที่ไม่มี parentId (คือหมวดหมู่หลัก) เพื่อไม่ให้หมวดหมู่ย่อยโชว์ในหน้ารวม
  const courseCategories = categoriesSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as CourseCategory))
    .filter(cat => !cat.parentId); 

  return <CourseCategoriesClient categories={courseCategories} />;
}
