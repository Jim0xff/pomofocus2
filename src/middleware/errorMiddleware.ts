import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../infra/HttpError.js';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const requestId = res.locals.requestId || 'unknown';
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      error: err.details,
      requestId,
    });
  }

  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'internal server error',
    requestId,
  });
}
