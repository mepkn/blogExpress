import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { userController } from '../controllers/user.controller'; // Added
import { authenticateJWT } from '../middleware/auth.middleware'; // Added
import { userScopedFavoriteRouter } from './favorite.routes';

export const userRouter = Router();

// POST /users/change-password - Change user password
userRouter.post('/change-password', authenticateJWT, userController.changePasswordHandler); // Added

// GET /users/:userId/posts - Get all user posts
userRouter.get('/:userId/posts', postController.getUserPostsHandler);

// Mount to /users path
userRouter.use('/', userScopedFavoriteRouter);