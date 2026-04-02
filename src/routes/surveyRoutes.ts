import { Router, type Request, type Response, type NextFunction } from 'express';
import { FIXED_QUESTIONNAIRE } from '../config/questionnaire.js';
import type { SubmissionService } from '../services/submissionService.js';

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };

export function createSurveyRouter(service: SubmissionService): Router {
  const surveyRoutes = Router();

  surveyRoutes.get('/api/questionnaires/fixed', (_req, res) => {
    res.json({ code: 'OK', message: 'success', data: FIXED_QUESTIONNAIRE });
  });

  surveyRoutes.post(
    '/api/submissions',
    asyncHandler(async (req, res) => {
      const created = await service.create(req.body);
      res.status(201).json({ code: 'OK', message: 'submitted', data: created });
    })
  );

  surveyRoutes.get(
    '/api/admin/submissions',
    asyncHandler(async (_req, res) => {
      const items = await service.list();
      res.json({ code: 'OK', message: 'success', data: items });
    })
  );

  surveyRoutes.get(
    '/api/admin/submissions/:id',
    asyncHandler(async (req, res) => {
      const item = await service.detail(req.params.id);
      res.json({ code: 'OK', message: 'success', data: item });
    })
  );

  return surveyRoutes;
}
