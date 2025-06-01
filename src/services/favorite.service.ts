import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { favorites, posts, users } from '../db/schema';
import {
  Favorite,
  PaginatedFavoritePosts,
  PaginationParams,
} from '../models/favorite.model';
import { Post, PublicPost } from '../models/post.model';

// Transform joined result to PublicPost
const transformToPublicPost = (result: { post: Post; authorUsername: string | null }): PublicPost => {
  const { userId, ...postData } = result.post;
  return {
    ...postData,
    authorUsername: result.authorUsername || 'Unknown',
  };
};

export const favoriteService = {
  // Verify post exists and is public
  _checkPostExistsAndPublic: async (postId: string): Promise<Post | null> => {
    const postResult = await db.query.posts.findFirst({
      where: and(eq(posts.id, postId), eq(posts.isPublic, true)),
    });
    return postResult || null;
  },

  // Get All Favorites Of User
  getUserFavoritePosts: async (userId: string, pagination: PaginationParams): Promise<PaginatedFavoritePosts> => {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const favoritedPostsQuery = db
      .select({
        post: posts,
        authorUsername: users.username,
      })
      .from(favorites)
      .innerJoin(posts, eq(favorites.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .limit(pageSize)
      .offset(offset);
    const results = await favoritedPostsQuery;
    const transformedPosts = results.map(item =>
      transformToPublicPost({ post: item.post, authorUsername: item.authorUsername })
    );
    const totalResult = await db
      .select({ value: count() })
      .from(favorites)
      .where(eq(favorites.userId, userId));
    const total = totalResult[0]?.value || 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      posts: transformedPosts,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  // Favorite Add
  addFavorite: async (userId: string, postId: string): Promise<Favorite | { error: string; details?: string }> => {
    const post = await favoriteService._checkPostExistsAndPublic(postId);
    if (!post) {
      return { error: 'Post not found or not public.' };
    }
    const existingFavorite = await db.query.favorites.findFirst({
      where: and(eq(favorites.userId, userId), eq(favorites.postId, postId)),
    });
    if (existingFavorite) {
      return { error: 'Already favorited.' };
    }
    try {
      const result = await db.insert(favorites).values({ userId, postId }).returning();
      if (!result || result.length === 0) {
        return { error: 'Failed to add favorite, no data returned from insert.' };
      }
      return result[0];
    } catch (dbError: any) {
      if (dbError.message && dbError.message.toLowerCase().includes('unique constraint failed')) {
        return { error: 'Already favorited (database constraint).' };
      }
      console.error('Add favorite database error:', dbError);
      return { error: 'Failed to add favorite due to a database error.', details: dbError.message };
    }
  },

  // Favorite Remove
  removeFavorite: async (userId: string, postId: string): Promise<boolean> => {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.postId, postId)))
      .returning({ id: favorites.id });
    return result.length > 0;
  },
};
