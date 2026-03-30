import { Router } from 'express';

export const healthRouter = Router();
healthRouter.get('/health', (_req, res) => {
  res.json({ code: 'OK', message: 'service ready', data: {}, requestId: res.locals.requestId });
});
