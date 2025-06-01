import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { comments } from '../db/schema';

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
export type PublicComment = Omit<Comment, 'userId'> & {
  authorUsername: string;
};
export type CreateCommentPayload = {
  text: string;
};
export interface PaginatedComments {
  comments: PublicComment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface PaginationParams {
  page: number;
  pageSize: number;
}
