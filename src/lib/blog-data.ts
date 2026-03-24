// This data is now managed in Firestore.
// Collection: 'blogPosts'

export type BlogPost = {
  slug: string; // Using slug as document ID
  title: string;
  author: string;
  date: string; // Store as ISO string in Firestore
  image: string;
  hint: string;
  excerpt: string;
  category: string;
  // content will be added later
};
