import { NextFunction, Request, Response } from 'express';

interface HttpError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorMiddleware = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl || req.url;
  console.error(
    `[${timestamp}] Error processing request ${req.method} ${path}:`,
    err.message,
    process.env.NODE_ENV === 'development' ? err.stack : '(stack trace hidden in production)'
  );
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.statusCode || 500;
  const responseMessage = err.isOperational || process.env.NODE_ENV === 'development'
    ? err.message
    : 'Internal Server Error';
  res.status(statusCode).json({
    status: err.status || 'error',
    message: responseMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
