import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { commentRouter } from './comment.routes';
import { postScopedFavoriteRouter } from './favorite.routes';

export const postRouter = Router();

// POST /posts - Create a new post
postRouter.post('/', authenticateJWT, postController.createPostHandler);

// GET /posts - Get all public posts
postRouter.get('/', postController.getPublicPostsHandler);

// GET /posts/:id - Get a single post by ID
postRouter.get('/:id', postController.getPostByIdHandler);

// PUT /posts/:id - Update a post
postRouter.put('/:id', authenticateJWT, postController.updatePostHandler);

// DELETE /posts/:id - Delete a post
postRouter.delete('/:id', authenticateJWT, postController.deletePostHandler);

// Mount to /posts/:postId/comments path
postRouter.use('/:postId/comments', commentRouter);

// Mount to /posts/:postId/favorite path
postRouter.use('/:postId/favorite', postScopedFavoriteRouter);

// GET /posts/tags/:tagName - Get posts by tag name
postRouter.get('/tags/:tagName', postController.getPostsByTagHandler);