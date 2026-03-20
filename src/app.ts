import express, { type Express } from 'express';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { requestIdMiddleware } from './middleware/request-id';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use(authMiddleware);

  app.get('/health', (req, res) => {
    res.status(200).json({
      graphqlPath: env.graphqlPath,
      requestId: req.requestId,
      service: env.appName,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

export function registerFallbackHandlers(app: Express): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
