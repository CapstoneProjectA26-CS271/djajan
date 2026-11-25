import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { menuRouter } from './routes/menus.js';
import { adminMenuRouter } from './routes/adminMenus.js';
import { requireAuth } from './middleware/requireAuth.js';
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
app.use('/api/auth', authRouter);
app.use('/api/menus', menuRouter);

// Everything under /api/admin needs a valid JWT, including paths that do not exist (no route probing).
app.use('/api/admin', requireAuth);
app.use('/api/admin/menus', adminMenuRouter);

app.use(notFoundHandler);
app.use(errorHandler);
