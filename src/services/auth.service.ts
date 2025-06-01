import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { refreshTokens, users } from '../db/schema';

// Environment Variable Setup & Validation
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '15m';
const REFRESH_TOKEN_EXPIRATION_SECONDS = parseInt(process.env.REFRESH_TOKEN_EXPIRATION_SECONDS || '604800', 10);
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || process.env.SALT_ROUNDS || '10', 10);

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.error("FATAL ERROR: ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET is not defined.");
  process.exit(1);
}

export interface AccessTokenPayload {
  id: string;
  username: string;
}

export interface RefreshTokenPayload {
  id: string;
}

export const authService = {
  // Password Hashing
  hashPassword: async (password: string): Promise<string> => {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  },

  // Password Compare
  comparePassword: async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
  },

  // Refresh Token Hashing
  hashRefreshToken: async (token: string): Promise<string> => {
    return bcrypt.hash(token, BCRYPT_SALT_ROUNDS);
  },

  // Token Generation
  generateAuthTokens: (userId: string, username: string): { accessToken: string; refreshToken: string } => {
    const accessTokenPayload: AccessTokenPayload = { id: userId, username };
    const accessToken = jwt.sign(accessTokenPayload, ACCESS_TOKEN_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRATION });
    const refreshTokenPayload: RefreshTokenPayload = { id: userId };
    const refreshToken = jwt.sign(refreshTokenPayload, REFRESH_TOKEN_SECRET!, { expiresIn: `${REFRESH_TOKEN_EXPIRATION_SECONDS}s` });
    return { accessToken, refreshToken };
  },

  // Refresh Token Storage and Management
  storeRefreshToken: async (userId: string, refreshToken: string, refreshTokenExpiresAt: Date): Promise<void> => {
    const hashedToken = await authService.hashRefreshToken(refreshToken);
    await db.insert(refreshTokens).values({
      userId,
      hashedToken,
      expiresAt: refreshTokenExpiresAt,
    });
  },

  // Core Refresh Token Logic
  verifyAndProcessRefreshToken: async (
    providedToken: string
  ): Promise<{ newAccessToken: string; newRefreshToken: string; user: { id: string; username: string } } | null> => {
    try {
      // 1. Verify the JWT structure and signature of the provided refresh token itself
      const decodedRefreshToken = jwt.verify(providedToken, REFRESH_TOKEN_SECRET!) as (jwt.JwtPayload & RefreshTokenPayload);
      if (!decodedRefreshToken || !decodedRefreshToken.id) {
        console.warn('Refresh token payload is invalid or missing user ID.');
        return null;
      }
      const userId = decodedRefreshToken.id;

      // 2. Hash the provided token to find it in the database
      const providedHashedToken = await authService.hashRefreshToken(providedToken);

      const storedTokenEntry = await db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.hashedToken, providedHashedToken),
          eq(refreshTokens.userId, userId)
        ),
      });
      if (!storedTokenEntry) {
        console.warn(`Refresh token not found in DB for user ${userId} with provided hash.`);
        await authService.revokeAllTokensForUser(userId);
        return null;
      }

      // 3. Delete the used token (Rotation)
      await db.delete(refreshTokens).where(eq(refreshTokens.id, storedTokenEntry.id));

      // 4. Check if the (now deleted) token was expired
      if (new Date() > new Date(storedTokenEntry.expiresAt)) {
        console.warn(`Used refresh token was expired for user ${userId}. All tokens for user revoked.`);
        await authService.revokeAllTokensForUser(userId);
        return null;
      }

      // 5. Fetch user details for new access token payload
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, username: true },
      });
      if (!user) {
        console.error(`User ${userId} not found after validating refresh token.`);
        return null;
      }

      // 6. Generate new pair of tokens
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = authService.generateAuthTokens(user.id, user.username);

      // 7. Store the new refresh token
      const newRefreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_SECONDS * 1000);
      await authService.storeRefreshToken(user.id, newRefreshToken, newRefreshTokenExpiresAt);

      return { newAccessToken, newRefreshToken, user: { id: user.id, username: user.username } };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.warn('Provided refresh token is JWT-expired:', error.message);
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.warn('Provided refresh token is invalid (JWT error):', error.message);
      } else {
        console.error('Error in verifyAndProcessRefreshToken:', error);
      }
      return null;
    }
  },

  // Token Revocation
  revokeRefreshTokenByToken: async (providedToken: string): Promise<boolean> => {
    const hashedToken = await authService.hashRefreshToken(providedToken);
    const result = await db.delete(refreshTokens).where(eq(refreshTokens.hashedToken, hashedToken)).returning({ id: refreshTokens.id });
    return result.length > 0;
  },

  // All Token Revocation
  revokeAllTokensForUser: async (userId: string): Promise<void> => {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    console.log(`All refresh tokens revoked for user ${userId}.`);
  },

  // Access Token Verification
  verifyAccessToken: async (token: string): Promise<AccessTokenPayload | null> => {
    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET!) as (jwt.JwtPayload & AccessTokenPayload);
      if (decoded && typeof decoded.id === 'string' && typeof decoded.username === 'string') {
        return { id: decoded.id, username: decoded.username };
      }
      console.error('Access token verification succeeded but payload structure is unexpected.');
      return null;
    } catch (error) {
      return null;
    }
  },
};
