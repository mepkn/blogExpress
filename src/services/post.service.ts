import { and, count, desc, eq, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { posts, users, tags, postTags } from '../db/schema';
import {
  CreatePostPayload,
  PaginatedPosts,
  PaginationParams,
  Post, // This type now includes tags?: string[]
  PublicPost, // This type now includes tags?: string[]
  UpdatePostPayload,
} from '../models/post.model';
import { PgTransaction } from 'drizzle-orm/pg-core'; // Assuming postgres, adjust if SQLite
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';

// Define a generic transaction type compatible with SQLite,
// Drizzle doesn't export a single cross-DB transaction type easily.
type DBTransaction = SQLiteTransaction<any, any, any, any>;


// Helper function to process tags
const processTags = async (postId: string, tagNames: string[] | undefined, tx: DBTransaction): Promise<void> => {
  if (tagNames && tagNames.length > 5) {
    throw new Error("A post can have a maximum of 5 tags.");
  }
  // 1. Delete existing tag associations for the post
  await tx.delete(postTags).where(eq(postTags.postId, postId));

  if (!tagNames || tagNames.length === 0) {
    return; // No tags to process or tags are explicitly cleared
  }

  // 2. Process each tag name
  for (const name of tagNames) {
    let [tag] = await tx.select().from(tags).where(eq(tags.name, name)).limit(1);
    if (!tag) {
      [tag] = await tx.insert(tags).values({ name }).returning();
    }
    if (tag && tag.id) {
      await tx.insert(postTags).values({ postId, tagId: tag.id });
    }
  }
};

// Helper to get tags for a list of post IDs
const getTagsForPostIds = async (postIds: string[]): Promise<Record<string, string[]>> => {
  if (postIds.length === 0) {
    return {};
  }
  const tagsResult = await db
    .select({
      postId: postTags.postId,
      tagName: tags.name,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, postIds));

  const tagsMap: Record<string, string[]> = {};
  for (const row of tagsResult) {
    if (!tagsMap[row.postId]) {
      tagsMap[row.postId] = [];
    }
    tagsMap[row.postId].push(row.tagName);
  }
  return tagsMap;
};


// Transform joined result to PublicPost
const transformToPublicPost = (
    result: { post: Post; authorUsername: string | null },
    tags?: string[] // Tags can be passed separately if fetched separately
  ): PublicPost => {
  const { userId, ...postData } = result.post; // postData might already have tags if Post type is updated
  return {
    ...postData,
    authorUsername: result.authorUsername || 'Unknown',
    tags: tags || result.post.tags || [], // Prioritize explicitly passed tags, then from Post, then default to empty
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

    const postIds = results.map((r) => r.post.id);
    const tagsMap = await getTagsForPostIds(postIds);

    const publicPosts = results.map((result) => {
      return transformToPublicPost(result, tagsMap[result.post.id] || []);
    });

    return {
      posts: publicPosts,
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

    const postIds = results.map((r) => r.post.id);
    const tagsMap = await getTagsForPostIds(postIds);

    const userPosts = results.map((result) => {
      return transformToPublicPost(result, tagsMap[result.post.id] || []);
    });

    return {
      posts: userPosts,
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
      return null; // Access denied
    }

    const tagsMap = await getTagsForPostIds([foundPost.id]);

    return transformToPublicPost(result[0], tagsMap[foundPost.id] || []);
  },

  // Post Add
  createPost: async (payload: CreatePostPayload, userId: string): Promise<Post> => {
    return db.transaction(async (tx) => {
      const newPostData = {
        title: payload.title,
        body: payload.body,
        isPublic: payload.isPublic,
        userId,
      };
      const [insertedPost] = await tx.insert(posts).values(newPostData).returning();
      if (!insertedPost) { // Should not happen if insert is successful
        throw new Error('Post creation failed, no data returned.');
      }

      if (payload.tags) {
        await processTags(insertedPost.id, payload.tags, tx);
      }

      // Fetch the post again with its tags to match the Post type
      // This is inefficient but ensures the return type is correct.
      // A more optimized way would be to construct the Post object manually if processTags returns the tag objects.
      const finalPostWithTags = await tx
        .select({
            id: posts.id,
            title: posts.title,
            body: posts.body,
            userId: posts.userId,
            isPublic: posts.isPublic,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            // Aggregate tags here if possible with Drizzle without raw SQL, or fetch separately
            // For now, we'll fetch separately below as done in getTagsForPostIds
        })
        .from(posts)
        .where(eq(posts.id, insertedPost.id))
        .limit(1);

      if (!finalPostWithTags[0]) {
        throw new Error("Failed to retrieve post after creation.");
      }

      const tagsArray = payload.tags || []; // Use provided tags as they were just processed

      return {
        ...finalPostWithTags[0],
        tags: tagsArray,
      };
    });
  },

  // Post Update
  updatePost: async (postId: string, payload: UpdatePostPayload, userId: string): Promise<Post | null> => {
    return db.transaction(async (tx) => {
      const [existingPost] = await tx.select().from(posts).where(eq(posts.id, postId)).limit(1);
      if (!existingPost) {
        return null;
      }
      if (existingPost.userId !== userId) {
        throw new Error('Unauthorized: You do not own this post.');
      }

      const { tags, ...postUpdateData } = payload;

      if (Object.keys(postUpdateData).length > 0) {
        await tx.update(posts).set(postUpdateData).where(eq(posts.id, postId));
      }

      // Process tags if the 'tags' key is present in the payload
      // This allows clearing tags with an empty array or updating them.
      if (payload.hasOwnProperty('tags')) {
        await processTags(postId, tags, tx);
      }

      // Fetch the updated post to return
      const [updatedPostFromDb] = await tx
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!updatedPostFromDb) { // Should not happen
          return null;
      }

      // Fetch current tags for the post to ensure accurate return
      const currentTagsMap = await getTagsForPostIds([postId]); // This uses the main db connection, not tx.
                                                              // For strict transaction, pass tx to getTagsForPostIds
                                                              // or replicate its logic here with tx.
                                                              // For simplicity here, we'll assume this is acceptable for read after write.
                                                              // Or, if payload.tags was provided, use that.

      let finalTags: string[];
      if (payload.hasOwnProperty('tags')) {
        finalTags = payload.tags || [];
      } else {
        // If tags were not part of the payload, fetch existing ones
        const postTagsResult = await tx
            .select({ tagName: tags.name })
            .from(postTags)
            .innerJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, postId));
        finalTags = postTagsResult.map(t => t.tagName);
      }

      return {
        ...updatedPostFromDb,
        tags: finalTags,
      };
    });
  },

  // Post Delete
  deletePost: async (postId: string, userId: string): Promise<boolean> => {
    // Transactions are good here too if there were more dependent operations,
    // but for a simple delete + check, it might be okay.
    // However, postTags are set to cascade delete, so the DB handles that.
    const [existingPost] = await db.select({id: posts.id, userId: posts.userId}).from(posts).where(eq(posts.id, postId)).limit(1);
    if (!existingPost) {
      return false; // Not found
    }
    if (existingPost.userId !== userId) {
      throw new Error('Unauthorized: You do not own this post.'); // Or return false if silent failure is preferred
    }
    const result = await db.delete(posts).where(eq(posts.id, postId)).returning({ id: posts.id });
    return result.length > 0;
  },

  // Get Posts by Tag Name
  getPostsByTagName: async (
    tagName: string,
    pagination: PaginationParams,
  ): Promise<PaginatedPosts<PublicPost>> => {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    // 1. Find the tag by tagName
    const [tagObject] = await db.select().from(tags).where(eq(tags.name, tagName)).limit(1);

    if (!tagObject) {
      return { // Tag not found, return empty result
        posts: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // 2. Get all postIds associated with this tagId that are public
    // We need to join postTags with posts to filter by isPublic and also for pagination later
    const postsByTagQuery = db
      .selectDistinct({ postId: postTags.postId })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(and(eq(postTags.tagId, tagObject.id), eq(posts.isPublic, true)));

    // Count total matching posts for pagination
    // Drizzle doesn't directly support count on a subquery like this easily without raw SQL or complex constructs.
    // A simpler way for total count is to fetch all relevant post IDs first, then count them.
    const allMatchingPostIdsResult = await postsByTagQuery;
    const total = allMatchingPostIdsResult.length;
    const totalPages = Math.ceil(total / pageSize);

    if (total === 0) {
        return { posts: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // 3. Fetch the actual post data for the current page
    const paginatedPostIds = allMatchingPostIdsResult.slice(offset, offset + pageSize).map(p => p.postId);

    if (paginatedPostIds.length === 0 && total > 0 && page > 1) { // Requested page beyond available data
        return { posts: [], total, page, pageSize, totalPages };
    }
    if (paginatedPostIds.length === 0) { // No posts for this tag on any page
        return { posts: [], total: 0, page, pageSize, totalPages: 0 };
    }


    const results = await db
      .select({
        post: posts,
        authorUsername: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(inArray(posts.id, paginatedPostIds), eq(posts.isPublic, true))) // Redundant isPublic here but good for safety
      .orderBy(desc(posts.createdAt)); // Limit & offset already applied by slicing post IDs

    // 4. Fetch tags for these posts
    const actualPostIdsOnPage = results.map((r) => r.post.id);
    const tagsMap = await getTagsForPostIds(actualPostIdsOnPage);

    const publicPosts = results.map((result) => {
      return transformToPublicPost(result, tagsMap[result.post.id] || []);
    });

    return {
      posts: publicPosts,
      total,
      page,
      pageSize,
      totalPages,
    };
  },
};
