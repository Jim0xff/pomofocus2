import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { AppError } from './infra/errors.js';
import { getQuestionnaire, submitResponse, listResponses, getResponseDetail } from './services/surveyService.js';

export function createApp() {
  const app = express();
  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', requestId);
    (req as any).requestId = requestId;
    next();
  });
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get('/api/questionnaire', async (_req, res, next) => {
    try { res.json({ data: await getQuestionnaire() }); } catch (e) { next(e); }
  });

  app.post('/api/responses', async (req, res, next) => {
    try {
      const result = await submitResponse(req.body?.questionnaire_id, req.body?.answers);
      res.status(201).json({ data: result });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/responses', async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.page_size || 20);
      res.json({ data: await listResponses(page, pageSize) });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/responses/:response_id', async (req, res, next) => {
    try { res.json({ data: await getResponseDetail(req.params.response_id) }); } catch (e) { next(e); }
  });

  if (process.env.NODE_ENV === 'test') {
    app.get('/api/__test__/panic', (_req, _res, next) => {
      next(new Error('panic-for-500-test'));
    });
  }

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = (req as any).requestId || randomUUID();
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, requestId, details: err.details } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'unexpected server error', requestId, details: {} } });
  });

  return app;
}
