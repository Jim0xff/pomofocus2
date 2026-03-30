import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../infra/HttpError.js';
import { verifyToken } from '../services/adminAuthService.js';

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.header('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'UNAUTHORIZED', 'token missing or invalid', { reason: 'token_missing' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    await verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
