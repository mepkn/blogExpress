import { Router } from 'express';
import { commentController } from '../controllers/comment.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

export const commentRouter = Router({ mergeParams: true });

// POST /posts/:postId/comments - Create a new comment for a post
commentRouter.post('/', authenticateJWT, commentController.createCommentHandler);

// GET /posts/:postId/comments - Get all comments for a post
commentRouter.get('/', commentController.getPostCommentsHandler);

// DELETE /posts/:postId/comments/:commentId - Delete a comment
commentRouter.delete('/:commentId', authenticateJWT, commentController.deleteCommentHandler);