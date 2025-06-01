import { Request, Response } from 'express';
import { CreatePostPayload, PaginationParams, UpdatePostPayload } from '../models/post.model';
import { postService } from '../services/post.service';

const getPaginationParams = (req: Request): PaginationParams => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
  return { page: Math.max(1, page), pageSize: Math.max(1, Math.min(100, pageSize)) };
};

export const postController = {
  createPostHandler: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { title, body, isPublic } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }
    if (typeof title !== 'string' || typeof body !== 'string') {
      return res.status(400).json({ message: 'Invalid input types for title or body.' });
    }
    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'Invalid type for isPublic.' });
    }
    const payload: CreatePostPayload = { title, body, isPublic: isPublic === undefined ? true : isPublic };
    const userId = req.user.id;
    try {
      const post = await postService.createPost(payload, userId);
      return res.status(201).json(post);
    } catch (error: any) {
      console.error('Create post error:', error.message);
      return res.status(500).json({ message: 'Failed to create post.' });
    }
  },

  getPostByIdHandler: async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestingUserId = req.user?.id;
    try {
      const post = await postService.getPostById(id, requestingUserId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found or access denied.' });
      }
      return res.status(200).json(post);
    } catch (error: any) {
      console.error(`Get post by ID (${id}) error:`, error.message);
      return res.status(500).json({ message: 'Failed to retrieve post.' });
    }
  },

  getPublicPostsHandler: async (req: Request, res: Response) => {
    const paginationParams = getPaginationParams(req);
    try {
      const paginatedResult = await postService.getPublicPosts(paginationParams);
      return res.status(200).json(paginatedResult);
    } catch (error: any) {
      console.error('Get public posts error:', error.message);
      return res.status(500).json({ message: 'Failed to retrieve public posts.' });
    }
  },

  getUserPostsHandler: async (req: Request, res: Response) => {
    const { userId: targetUserId } = req.params;
    const requestingUserId = req.user?.id;
    const paginationParams = getPaginationParams(req);
    try {
      const paginatedResult = await postService.getUserPosts(targetUserId, paginationParams, requestingUserId);
      return res.status(200).json(paginatedResult);
    } catch (error: any) {
      console.error(`Get user posts (${targetUserId}) error:`, error.message);
      return res.status(500).json({ message: 'Failed to retrieve user posts.' });
    }
  },

  updatePostHandler: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { id: postId } = req.params;
    const userId = req.user.id;
    const { title, body, isPublic } = req.body;
    if (title !== undefined && typeof title !== 'string') {
      return res.status(400).json({ message: 'Invalid type for title.' });
    }
    if (body !== undefined && typeof body !== 'string') {
      return res.status(400).json({ message: 'Invalid type for body.' });
    }
    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'Invalid type for isPublic.' });
    }
    const payload: UpdatePostPayload = {};
    if (title !== undefined) payload.title = title;
    if (body !== undefined) payload.body = body;
    if (isPublic !== undefined) payload.isPublic = isPublic;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }
    try {
      const updatedPost = await postService.updatePost(postId, payload, userId);
      if (!updatedPost) {
        return res.status(404).json({ message: 'Post not found.' });
      }
      return res.status(200).json(updatedPost);
    } catch (error: any) {
      console.error(`Update post (${postId}) error:`, error.message);
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ message: 'Forbidden: You do not own this post.' });
      }
      return res.status(500).json({ message: 'Failed to update post.' });
    }
  },

  deletePostHandler: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { id: postId } = req.params;
    const userId = req.user.id;
    try {
      const success = await postService.deletePost(postId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Post not found or you do not have permission to delete it.' });
      }
      return res.status(204).send();
    } catch (error: any) {
      console.error(`Delete post (${postId}) error:`, error.message);
      return res.status(500).json({ message: 'Failed to delete post.' });
    }
  },
};
