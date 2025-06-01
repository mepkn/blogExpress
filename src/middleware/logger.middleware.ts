import { NextFunction, Request, Response } from 'express';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || '';
  console.log(`[${timestamp}] ${method} ${url} - User-Agent: "${userAgent}"`);
  res.on('finish', () => {
    console.log(`[${timestamp}] ${method} ${url} - Status: ${res.statusCode} - User-Agent: "${userAgent}"`);
  });
  next();
};
