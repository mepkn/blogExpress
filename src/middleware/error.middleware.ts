import { Request, Response, NextFunction } from 'express';

// A simple interface for errors that might have a statusCode
interface HttpError extends Error {
  statusCode?: number;
  status?: string; // Optional: for consistency with other error responses
  isOperational?: boolean; // Optional: for distinguishing operational errors
}

export const errorMiddleware = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl || req.url;

  // Log the full error internally, especially the stack for debugging
  console.error(
    `[${timestamp}] Error processing request ${req.method} ${path}:`,
    err.message,
    // Avoid logging the full error object in production if it might contain sensitive details,
    // but stack is usually very helpful for debugging.
    process.env.NODE_ENV === 'development' ? err.stack : '(stack trace hidden in production)'
  );

  // If headers have already been sent, delegate to the default Express error handler
  // as we can't send a new response.
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
    // Optionally include stack in development, but generally not in production for security
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
