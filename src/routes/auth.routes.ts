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

// POST /auth/forgot-password - To request a password reset token
authRouter.post('/forgot-password', authController.forgotPasswordHandler);

// POST /auth/reset-password - To reset password with a token
authRouter.post('/reset-password', authController.resetPasswordHandler);