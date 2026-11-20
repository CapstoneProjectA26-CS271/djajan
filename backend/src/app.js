import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

// Render sits behind one proxy; needed for the real client IP in req.ip (rate limiting).
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json({ limit: '100kb' }));

app.use('/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
