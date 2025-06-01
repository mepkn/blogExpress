import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { posts, users } from '../db/schema';
import {
  CreatePostPayload,
  PaginatedPosts,
  PaginationParams,
  Post,
  PublicPost,
  UpdatePostPayload,
} from '../models/post.model';

// Transform joined result to PublicPost
const transformToPublicPost = (result: { post: Post; authorUsername: string | null }): PublicPost => {
  const { userId, ...postData } = result.post;
  return {
    ...postData,
    authorUsername: result.authorUsername || 'Unknown',
  };
};

export const postService = {
  // Get All Public Posts
  getPublicPosts: async (pagination: PaginationParams): Promise<PaginatedPosts<PublicPost>> => {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const publicPostsCondition = eq(posts.isPublic, true);
    const results = await db
      .select({
        post: posts,
        authorUsername: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(publicPostsCondition)
      .orderBy(desc(posts.createdAt))
      .limit(pageSize)
      .offset(offset);
    const totalResult = await db.select({ value: count() }).from(posts).where(publicPostsCondition);
    const total = totalResult[0]?.value || 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      posts: results.map(transformToPublicPost),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  // Get All Posts Of Users
  getUserPosts: async (
    targetUserId: string,
    pagination: PaginationParams,
    requestingUserId?: string,
  ): Promise<PaginatedPosts<PublicPost>> => {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    let conditions = eq(posts.userId, targetUserId);
    if (targetUserId !== requestingUserId) {
      conditions = and(conditions, eq(posts.isPublic, true))!;
    }
    const results = await db
      .select({
        post: posts,
        authorUsername: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(conditions)
      .orderBy(desc(posts.createdAt))
      .limit(pageSize)
      .offset(offset);
    const totalResult = await db.select({ value: count() }).from(posts).where(conditions);
    const total = totalResult[0]?.value || 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      posts: results.map(transformToPublicPost),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  // Get Post By ID
  getPostById: async (postId: string, requestingUserId?: string): Promise<PublicPost | null> => {
    const result = await db
      .select({
        post: posts,
        authorUsername: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);
    if (result.length === 0) {
      return null;
    }
    const foundPost = result[0].post;
    if (!foundPost.isPublic && foundPost.userId !== requestingUserId) {
      return null;
    }
    return transformToPublicPost(result[0]);
  },

  // Post Add
  createPost: async (payload: CreatePostPayload, userId: string): Promise<Post> => {
    const newPostData = {
      ...payload,
      userId,
    };
    const result = await db.insert(posts).values(newPostData).returning();
    if (!result || result.length === 0) {
      throw new Error('Post creation failed, no data returned.');
    }
    return result[0];
  },

  // Post Update
  updatePost: async (postId: string, payload: UpdatePostPayload, userId: string): Promise<Post | null> => {
    const existingPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });
    if (!existingPost) {
      return null;
    }
    if (existingPost.userId !== userId) {
      throw new Error('Unauthorized: You do not own this post.');
    }
    if (Object.keys(payload).length === 0) {
      return existingPost;
    }
    const result = await db.update(posts).set(payload).where(eq(posts.id, postId)).returning();
    return result.length > 0 ? result[0] : null;
  },

  // Post Delete
  deletePost: async (postId: string, userId: string): Promise<boolean> => {
    const existingPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });
    if (!existingPost) {
      return false;
    }
    if (existingPost.userId !== userId) {
      return false;
    }
    const result = await db.delete(posts).where(eq(posts.id, postId)).returning({ id: posts.id });
    return result.length > 0;
  },
};
