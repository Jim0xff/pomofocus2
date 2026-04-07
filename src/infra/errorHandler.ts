import type { NextFunction, Request, Response } from 'express';
import { HttpError, InternalServerError } from './HttpError.js';
import { currentRequestId, logger } from './logger.js';

export interface ApiErrorResponse {
  code: number;
  message: string;
  requestId: string;
  details?: unknown;
  data: null;
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const resolved = err instanceof HttpError ? err : new InternalServerError();
  logger.error('Unhandled REST error: %s', resolved.message);

  const response: ApiErrorResponse = {
    code: resolved.code,
    message: resolved.message,
    requestId: currentRequestId() ?? 'unknown-request',
    details: resolved.details,
    data: null,
  };

  res.status(resolved.statusCode).json(response);
}
