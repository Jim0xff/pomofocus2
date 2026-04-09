import { Router } from 'express';
import { SurveyService } from '../services/surveyService.js';
import { UnauthorizedError } from '../errors/httpError.js';

export function buildSurveyRoutes(service: SurveyService): Router {
  const router = Router();

  const ensureAdminAuth = (req: any): void => {
    const auth = req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedError();
    }
  };

  router.get('/survey', async (req, res, next) => {
    try {
      const result = await service.getSurvey();
      res.status(200).json({
        requestId: (req as any).requestId,
        ...result
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/survey/submissions', async (req, res, next) => {
    try {
      const result = await service.submitSurvey(req.body);
      res.status(201).json({
        requestId: (req as any).requestId,
        ...result
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/submissions', async (req, res, next) => {
    try {
      ensureAdminAuth(req);
      const result = await service.listAdminSubmissions();
      res.status(200).json({
        requestId: (req as any).requestId,
        ...result
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/submissions/:submissionId', async (req, res, next) => {
    try {
      ensureAdminAuth(req);
      const result = await service.getAdminSubmissionDetail(req.params.submissionId);
      res.status(200).json({
        requestId: (req as any).requestId,
        ...result
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
