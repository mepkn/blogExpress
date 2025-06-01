import { Request, Response } from 'express';
import { CreateCommentPayload, PaginationParams } from '../models/comment.model';
import { commentService } from '../services/comment.service';

const getPaginationParams = (req: Request): PaginationParams => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
  return { page: Math.max(1, page), pageSize: Math.max(1, Math.min(100, pageSize)) };
};

export const commentController = {
  createCommentHandler: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }
    if (typeof text !== 'string') {
      return res.status(400).json({ message: 'Invalid input type for text.' });
    }
    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ message: 'Post ID is required and must be a string.' });
    }
    const payload: CreateCommentPayload = { text };
    try {
      const comment = await commentService.createComment(payload, userId, postId);
      return res.status(201).json(comment);
    } catch (error: any) {
      console.error(`Create comment error for post ${postId}:`, error.message);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to create comment.' });
    }
  },

  getPostCommentsHandler: async (req: Request, res: Response) => {
    const { postId } = req.params;
    const paginationParams = getPaginationParams(req);
    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ message: 'Post ID is required and must be a string.' });
    }
    try {
      const paginatedResult = await commentService.getCommentsByPostId(postId, paginationParams);
      return res.status(200).json(paginatedResult);
    } catch (error: any) {
      console.error(`Get comments for post ${postId} error:`, error.message);
      return res.status(500).json({ message: 'Failed to retrieve comments.' });
    }
  },

  deleteCommentHandler: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { commentId } = req.params;
    const userId = req.user.id;
    if (!commentId || typeof commentId !== 'string') {
      return res.status(400).json({ message: 'Comment ID is required and must be a string.' });
    }
    try {
      const success = await commentService.deleteComment(commentId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Comment not found.' });
      }
      return res.status(204).send();
    } catch (error: any) {
      console.error(`Delete comment ${commentId} error:`, error.message);
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ message: 'Forbidden: You do not own this comment.' });
      }
      return res.status(500).json({ message: 'Failed to delete comment.' });
    }
  },
};
