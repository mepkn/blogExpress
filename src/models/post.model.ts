import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { posts } from '../db/schema';

export type Post = InferSelectModel<typeof posts> & { tags?: string[] };
export type NewPost = InferInsertModel<typeof posts>;
export type PublicPost = Omit<Post, 'userId'> & {
  authorUsername: string;
  tags?: string[]; // Explicitly adding here for clarity, though it would be inherited
};
export type CreatePostPayload = Omit<NewPost, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { tags?: string[] };
export type UpdatePostPayload = Partial<Omit<NewPost, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> & { tags?: string[] };
export interface PaginatedPosts<T> {
  posts: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface PaginationParams {
  page: number;
  pageSize: number;
}
