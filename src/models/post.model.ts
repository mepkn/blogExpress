import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { posts } from '../db/schema';

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;
export type PublicPost = Omit<Post, 'userId'> & {
  authorUsername: string;
};
export type CreatePostPayload = Omit<NewPost, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdatePostPayload = Partial<Omit<NewPost, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
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
