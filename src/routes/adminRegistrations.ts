import { Router } from 'express';
import { HttpError } from '../infra/HttpError.js';
import { getRegistrationDetail, listRegistrations } from '../services/registrationService.js';

export const adminRegistrationsRouter = Router();

adminRegistrationsRouter.get('/admin/registrations', async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'invalid pagination', { reason: 'range' });
    }
    const data = await listRegistrations(page, pageSize);
    return res.json({ code: 'OK', message: 'success', data, requestId: res.locals.requestId });
  } catch (error) {
    return next(error);
  }
});

adminRegistrationsRouter.get('/admin/registrations/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'id must be positive integer', { field: 'id', reason: 'range' });
    }
    const data = await getRegistrationDetail(id);
    return res.json({ code: 'OK', message: 'success', data, requestId: res.locals.requestId });
  } catch (error) {
    return next(error);
  }
});
