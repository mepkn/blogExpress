import 'dotenv/config';
import express, { json, NextFunction, Request, Response, urlencoded } from 'express'; // NextFunction, Request, Response might be removable if inline handlers are fully replaced
import { authRouter } from './routes/auth.routes';
import { postRouter } from './routes/post.routes';
import { userRouter } from './routes/user.routes';
// Import new middlewares
import { loggerMiddleware } from './middleware/logger.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { errorMiddleware } from './middleware/error.middleware';

const port = process.env.PORT || 3000;
const app = express();

// Standard Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Logger Middleware - Add this early
app.use(loggerMiddleware);

// API Routers
app.get('/', (req: Request, res: Response) => { // Keep existing root route for now
  res.send('Blog API is running!');
});
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/users', userRouter);
// Assuming commentRouter might be added later or was missed in the initial file read for this task by me.
// If src/routes/comment.routes.ts exists and exports commentRouter, it should be here.
// For now, I will stick to what was in the provided main.ts and the prompt's example routes.

// Not Found Middleware - Add after all routes
app.use(notFoundMiddleware);

// Error Handling Middleware - Add last
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server successfully started on port http://localhost:${port}`)
});
