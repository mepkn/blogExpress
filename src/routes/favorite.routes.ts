import { Router } from 'express';
import { favoriteController } from '../controllers/favorite.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

export const postScopedFavoriteRouter = Router({ mergeParams: true });

// POST /posts/:postId/favorite - Add a post to favorites
postScopedFavoriteRouter.post('/', authenticateJWT, favoriteController.addFavoriteHandler);

// DELETE /posts/:postId/favorite - Remove a post from favorites
postScopedFavoriteRouter.delete('/', authenticateJWT, favoriteController.removeFavoriteHandler);

export const userScopedFavoriteRouter = Router();

// GET /users/favorites - Get all favorite posts for the logged-in user
userScopedFavoriteRouter.get('/favorites', authenticateJWT, favoriteController.getFavoritePostsHandler);
