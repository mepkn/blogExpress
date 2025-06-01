import 'dotenv/config';
import express, { json, Request, Response, urlencoded } from 'express'; // NextFunction, Request, Response might be removable if inline handlers are fully replaced
import { authRouter } from './routes/auth.routes';
import { postRouter } from './routes/post.routes';
import { userRouter } from './routes/user.routes';
// Import new middlewares
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';

const port = process.env.PORT || 3000;
const app = express();

// Standard Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Logger Middleware
app.use(loggerMiddleware);

// API Routers
app.get('/', (req: Request, res: Response) => {
  res.send('Blog API is running!');
});
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/users', userRouter);

// Not Found Middleware
app.use(notFoundMiddleware);

// Error Handling Middleware
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server successfully started on port http://localhost:${port}`)
});
