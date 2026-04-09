import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/httpError.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as any).requestId || req.header('x-request-id') || 'unknown';

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      requestId,
      code: err.code,
      message: err.message
    });
    return;
  }

  res.status(500).json({
    requestId,
    code: 'INTERNAL_ERROR',
    message: 'internal server error'
  });
}
