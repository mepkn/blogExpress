import { Request, Response } from 'express';
import { CreateUserPayload } from '../models/user.model';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

const getEnvInt = (varName: string, defaultValue: number): number => {
  const val = process.env[varName];
  if (val) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
};

const REFRESH_TOKEN_EXPIRATION_SECONDS_CONFIG = getEnvInt('REFRESH_TOKEN_EXPIRATION_SECONDS', 604800);

export const authController = {
  register: async (req: Request, res: Response) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input types for username, email, or password.' });
    }
    try {
      const existingByEmail = await userService.findUserByEmail(email);
      if (existingByEmail) {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      const existingByUsername = await userService.findUserByUsername(username);
      if (existingByUsername) {
        return res.status(409).json({ message: 'Username already exists.' });
      }
      const createUserPayload: CreateUserPayload = { username, email, password };
      const publicUser = await userService.createUser(createUserPayload);
      const tokens = authService.generateAuthTokens(publicUser.id, publicUser.username);
      const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_SECONDS_CONFIG * 1000);
      await authService.storeRefreshToken(publicUser.id, tokens.refreshToken, refreshTokenExpiresAt);
      return res.status(201).json({
        user: publicUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error: any) {
      console.error('Registration error:', error.message);
      if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to register user due to an internal error.' });
    }
  },

  login: async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input types for username or password.' });
    }
    try {
      const user = await userService.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }
      const isPasswordValid = await authService.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }
      const tokens = authService.generateAuthTokens(user.id, user.username);
      const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_SECONDS_CONFIG * 1000);
      await authService.storeRefreshToken(user.id, tokens.refreshToken, refreshTokenExpiresAt);
      const { passwordHash, ...publicUser } = user;
      return res.status(200).json({
        user: publicUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error: any) {
      console.error('Login error:', error.message);
      return res.status(500).json({ message: 'Login failed due to an internal error.' });
    }
  },

  refreshTokenHandler: async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }
    if (typeof refreshToken !== 'string') {
      return res.status(400).json({ message: 'Invalid refresh token format.' });
    }
    try {
      const result = await authService.verifyAndProcessRefreshToken(refreshToken);
      if (result) {
        return res.status(200).json({
          accessToken: result.newAccessToken,
          refreshToken: result.newRefreshToken
        });
      } else {
        return res.status(401).json({ message: 'Invalid or expired refresh token. Please log in again.' });
      }
    } catch (error: any) {
      console.error('Refresh token processing error:', error.message);
      return res.status(500).json({ message: 'Failed to process refresh token.' });
    }
  },

  logoutHandler: async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required for logout.' });
    }
    if (typeof refreshToken !== 'string') {
      return res.status(400).json({ message: 'Invalid refresh token format.' });
    }
    try {
      const revoked = await authService.revokeRefreshTokenByToken(refreshToken);
      if (revoked) {
        return res.status(200).json({ message: 'Successfully logged out.' });
      } else {
        return res.status(200).json({ message: 'Logout successful (token not found or already invalidated).' });
      }
    } catch (error: any) {
      console.error('Logout error:', error.message);
      return res.status(500).json({ message: 'Logout failed due to an internal error.' });
    }
  },

  forgotPasswordHandler: async (req: Request, res: Response) => {
    const { email } = req.body;
    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';
    if (!email || typeof email !== 'string') {
      console.warn('Forgot password attempt with invalid email body:', email);
      return res.status(200).json({ message: genericMessage });
    }
    try {
      const user = await userService.findUserByEmail(email);
      if (user) {
        const { rawToken, hashedToken, expiresAt } = await authService.generatePasswordResetToken(user.id);
        await authService.storePasswordResetToken(user.id, hashedToken, expiresAt);
        console.log(`Password reset requested for ${user.email}. Token: ${rawToken}`);
      }
      return res.status(200).json({ message: genericMessage });
    } catch (error: any) {
      console.error('Forgot password error:', error.message);
      return res.status(200).json({ message: genericMessage });
    }
  },

  resetPasswordHandler: async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Token and new password are required and must be strings.' });
    }
    try {
      const verifiedTokenData = await authService.verifyPasswordResetToken(token);
      if (!verifiedTokenData) {
        return res.status(400).json({ message: 'Invalid or expired password reset token.' });
      }
      const passwordResetSuccessful = await authService.resetUserPassword(verifiedTokenData.userId, newPassword);
      if (passwordResetSuccessful) {
        await authService.deletePasswordResetToken(verifiedTokenData.hashedTokenInDb);
        await authService.revokeAllTokensForUser(verifiedTokenData.userId);
        return res.status(200).json({ message: 'Password has been reset successfully.' });
      } else {
        return res.status(500).json({ message: 'Failed to reset password due to an internal error.' });
      }
    } catch (error: any) {
      console.error('Reset password error:', error.message);
      return res.status(500).json({ message: 'An internal error occurred while attempting to reset password.' });
    }
  },
};
