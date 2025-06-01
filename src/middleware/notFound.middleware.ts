import { NextFunction, Request, Response } from 'express';

export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next();
  }
  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.method} ${req.originalUrl}`,
  });
};
