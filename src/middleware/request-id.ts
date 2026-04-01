import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.header('x-request-id') || randomUUID()).toString();
  res.setHeader('x-request-id', requestId);
  (req as Request & { requestId?: string }).requestId = requestId;
  next();
}
