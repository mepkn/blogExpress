import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { favorites } from '../db/schema';
import { PaginationParams as GeneralPaginationParams, PublicPost } from './post.model';

export type Favorite = InferSelectModel<typeof favorites>;
export type NewFavorite = InferInsertModel<typeof favorites>;
export interface PaginatedFavoritePosts {
  posts: PublicPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export type PaginationParams = GeneralPaginationParams;
