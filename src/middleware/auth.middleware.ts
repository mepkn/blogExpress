import { NextFunction, Request, Response } from 'express';
import { AccessTokenPayload, authService } from '../services/auth.service';

declare global {
  namespace Express {
    export interface Request {
      user?: Pick<AccessTokenPayload, 'id' | 'username'>;
    }
  }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (!token) {
      return res.status(401).json({ message: 'Access token is missing.' });
    }
    const userPayload = await authService.verifyAccessToken(token);
    if (userPayload) {
      req.user = { id: userPayload.id, username: userPayload.username };
      next();
    } else {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  } else {
    return res.status(401).json({ message: 'Authorization header is missing or is not Bearer type.' });
  }
};
