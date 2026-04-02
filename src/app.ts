import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './infra/errorHandler.js';
import { createSurveyRouter } from './routes/surveyRoutes.js';
import { SubmissionRepository } from './repositories/submissionRepository.js';
import { SubmissionService } from './services/submissionService.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ code: 'OK', message: 'healthy' });
  });

  const repository = new SubmissionRepository();
  const service = new SubmissionService(repository);

  app.use(createSurveyRouter(service));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
