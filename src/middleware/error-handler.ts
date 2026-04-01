import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../infra/errors.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { requestId?: string }).requestId || 'unknown';

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      requestId,
      details: err.details ?? null,
    });
  }

  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    requestId,
    details: null,
  });
}
