import express from 'express';
import { healthRouter } from './routes/health.js';
import { requestIdMiddleware } from './middleware/requestIdMiddleware.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { publicRegistrationsRouter } from './routes/publicRegistrations.js';
import { adminAuthRouter } from './routes/adminAuth.js';
import { adminRegistrationsRouter } from './routes/adminRegistrations.js';
import { authMiddleware } from './middleware/authMiddleware.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.use('/api/v1', healthRouter);
  app.use('/api/v1', publicRegistrationsRouter);
  app.use('/api/v1', adminAuthRouter);
  app.use('/api/v1', authMiddleware, adminRegistrationsRouter);

  app.use(errorMiddleware);
  return app;
}
