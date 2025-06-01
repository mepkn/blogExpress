import { Request, Response, NextFunction } from 'express';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || '';
  // Log basic information
  console.log(`[${timestamp}] ${method} ${url} - User-Agent: "${userAgent}"`);

  // Optionally, log request body (be cautious with sensitive data)
  // if (Object.keys(req.body).length > 0) {
  //   console.log(`  Body: ${JSON.stringify(req.body)}`); // Sanitize or omit sensitive data in production
  // }

  // Optionally, log when the response is finished
  res.on('finish', () => {
    console.log(`[${timestamp}] ${method} ${url} - Status: ${res.statusCode} - User-Agent: "${userAgent}"`);
  });

  next();
};
