import type { NextFunction, Request, Response } from 'express';
import { auth } from './auth.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const [bearer, token] = String(req.headers.authorization ?? '').split(' ');
  const user = bearer === 'Bearer' && token ? await auth(token) : null;
  (req as Request & { user?: unknown }).user = user;
  next();
}
