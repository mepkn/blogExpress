import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { comments, posts, users } from '../db/schema';
import {
  Comment,
  CreateCommentPayload,
  PaginatedComments,
  PaginationParams,
  PublicComment,
} from '../models/comment.model';
import { Post } from '../models/post.model';

// Transform joined result to PublicComment
const transformToPublicComment = (result: { comment: Comment; authorUsername: string | null }): PublicComment => {
  const { userId, ...commentData } = result.comment;
  return {
    ...commentData,
    authorUsername: result.authorUsername || 'Unknown',
  };
};

export const commentService = {
  // Verify post exists and is public
  _checkPostExistsAndPublic: async (postId: string): Promise<Post | null> => {
    const postResult = await db.query.posts.findFirst({
      where: and(eq(posts.id, postId), eq(posts.isPublic, true)),
    });
    return postResult || null;
  },

  // Get All Comments Of Posts
  getCommentsByPostId: async (postId: string, pagination: PaginationParams): Promise<PaginatedComments> => {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const post = await commentService._checkPostExistsAndPublic(postId);
    if (!post) {
      return { comments: [], total: 0, page, pageSize, totalPages: 0 };
    }
    const results = await db
      .select({
        comment: comments,
        authorUsername: users.username,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt))
      .limit(pageSize)
      .offset(offset);
    const totalResult = await db.select({ value: count() }).from(comments).where(eq(comments.postId, postId));
    const total = totalResult[0]?.value || 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      comments: results.map(transformToPublicComment),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  // Comment Add
  createComment: async (payload: CreateCommentPayload, userId: string, postId: string): Promise<PublicComment> => {
    const post = await commentService._checkPostExistsAndPublic(postId);
    if (!post) {
      throw new Error('Post not found or not available for comments.');
    }
    const newCommentData = {
      text: payload.text,
      userId,
      postId,
    };
    const returnedComment = await db.insert(comments).values(newCommentData).returning();
    if (!returnedComment || returnedComment.length === 0) {
      throw new Error('Comment creation failed, no data returned.');
    }
    const createdCommentId = returnedComment[0].id;
    const result = await db
      .select({
        comment: comments,
        authorUsername: users.username,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, createdCommentId))
      .get();
    if (!result) {
      throw new Error('Failed to retrieve created comment with author details.');
    }
    return transformToPublicComment(result);
  },

  // Comment Delete
  deleteComment: async (commentId: string, userId: string): Promise<boolean> => {
    const commentToDelete = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });
    if (!commentToDelete) {
      return false;
    }
    if (commentToDelete.userId !== userId) {
      throw new Error('Unauthorized: You do not own this comment.');
    }
    const result = await db.delete(comments).where(eq(comments.id, commentId)).returning({ id: comments.id });
    return result.length > 0;
  },
};
