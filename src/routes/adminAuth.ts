import { Router } from 'express';
import { HttpError } from '../infra/HttpError.js';
import { loginAdmin } from '../services/adminAuthService.js';

export const adminAuthRouter = Router();

adminAuthRouter.post('/admin/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'username and password are required', { reason: 'required' });
    }
    const data = await loginAdmin(username, password);
    return res.status(200).json({ code: 'OK', message: 'login success', data, requestId: res.locals.requestId });
  } catch (error) {
    return next(error);
  }
});
