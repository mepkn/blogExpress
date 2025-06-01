import { Request, Response, NextFunction } from 'express';

export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if headers have already been sent, in which case, do nothing further.
  // This can happen if a previous middleware/route handler partially handled the request
  // but didn't fully end it, and then `next()` was called.
  if (res.headersSent) {
    return next(); // Or potentially next(new Error("Headers already sent but reached notFoundMiddleware"))
  }

  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.method} ${req.originalUrl}`,
  });
};
