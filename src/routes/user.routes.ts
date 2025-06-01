import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { userScopedFavoriteRouter } from './favorite.routes';

export const userRouter = Router();

// GET /users/:userId/posts - Get all user posts
userRouter.get('/:userId/posts', postController.getUserPostsHandler);

// Mount to /users path
userRouter.use('/', userScopedFavoriteRouter);