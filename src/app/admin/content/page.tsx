
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { BlogPost } from '@/lib/blog-data';
import { ContentClientPage } from './content-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ManageContentPage() {
  const postsQuery = query(collection(db, 'blogPosts'), orderBy('date', 'desc'));
  const postsSnapshot = await getDocs(postsQuery);
  const posts = postsSnapshot.docs.map(doc => ({ slug: doc.id, ...doc.data() } as BlogPost));

  return <ContentClientPage posts={posts} />;
}
