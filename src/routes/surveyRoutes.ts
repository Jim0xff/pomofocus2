import { Router } from 'express';
import { SurveyService } from '../services/surveyService.js';

export function buildSurveyRoutes(service: SurveyService): Router {
  const router = Router();

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

  return router;
}
