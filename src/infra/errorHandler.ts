import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './errors.js';
import { logger } from './logger.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
    return;
  }

  logger.error({ message: 'unhandled_error', err });
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'internal server error' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ code: 'NOT_FOUND', message: 'route not found' });
}
