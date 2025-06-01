import 'dotenv/config';
import express, { json, NextFunction, Request, Response, urlencoded } from 'express';
import { authRouter } from './routes/auth.routes';
import { postRouter } from './routes/post.routes';
import { userRouter } from './routes/user.routes';

const port = process.env.PORT || 3000;
const app = express();

// Standard Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// API Routers
app.get('/', (req: Request, res: Response) => {
  res.send('Blog API is running!');
});
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/users', userRouter);

// Not Found Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Resource not found on this server." });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`Unhandled Error: ${err.message}`);
  console.error(err.stack);
  const responseError = process.env.NODE_ENV === 'development' ? err.stack : 'Internal Server Error';
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    message: 'An unexpected error occurred on the server.',
    error: process.env.NODE_ENV === 'development' ? responseError : undefined,
  });
});

app.listen(port, () => {
  console.log(`Server successfully started on port http://localhost:${port}`)
});
