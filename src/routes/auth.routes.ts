import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

export const authRouter = Router();

// POST /auth/register - To register user
authRouter.post('/register', authController.register);

// POST /auth/login - To login user
authRouter.post('/login', authController.login);

// POST /auth/refresh - To get a new access token using a refresh token
authRouter.post('/refresh', authController.refreshTokenHandler);

// POST /auth/logout - To invalidate a refresh token
authRouter.post('/logout', authController.logoutHandler);