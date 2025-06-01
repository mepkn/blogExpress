import { Request, Response } from 'express';
import { PaginationParams } from '../models/favorite.model';
import { favoriteService } from '../services/favorite.service';

const getPaginationParams = (req: Request): PaginationParams => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
  return { page: Math.max(1, page), pageSize: Math.max(1, Math.min(100, pageSize)) };
};

export const favoriteController = {
  addFavoriteHandler: async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { postId } = req.params;
    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ message: 'Post ID is required and must be a string.' });
    }
    try {
      const result = await favoriteService.addFavorite(userId, postId);
      if ('error' in result) {
        if (result.error.includes('Post not found')) {
          return res.status(404).json({ message: result.error });
        }
        if (result.error.includes('Already favorited')) {
          return res.status(409).json({ message: result.error });
        }
        return res.status(500).json({ message: result.error, details: result.details });
      }
      return res.status(201).json(result);
    } catch (error: any) {
      console.error(`Add favorite error for post ${postId}, user ${userId}:`, error.message);
      return res.status(500).json({ message: 'Failed to add favorite.' });
    }
  },

  removeFavoriteHandler: async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { postId } = req.params;
    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ message: 'Post ID is required and must be a string.' });
    }
    try {
      const success = await favoriteService.removeFavorite(userId, postId);
      if (!success) {
        return res.status(404).json({ message: 'Favorite entry not found.' });
      }
      return res.status(204).send();
    } catch (error: any) {
      console.error(`Remove favorite error for post ${postId}, user ${userId}:`, error.message);
      return res.status(500).json({ message: 'Failed to remove favorite.' });
    }
  },

  getFavoritePostsHandler: async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const paginationParams = getPaginationParams(req);
    try {
      const paginatedResult = await favoriteService.getUserFavoritePosts(userId, paginationParams);
      return res.status(200).json(paginatedResult);
    } catch (error: any) {
      console.error(`Get user's favorite posts error for user ${userId}:`, error.message);
      return res.status(500).json({ message: 'Failed to retrieve favorite posts.' });
    }
  },
};
