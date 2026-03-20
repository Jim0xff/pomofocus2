import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError } from '../errors/app-error';
import { HttpError } from '../errors/http-error';
import { logger } from '../shared/logger';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} was not found.`, {
      requestId: req.requestId,
    }),
  );
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      code: error.code,
      details: error.details,
      message: error.message,
      requestId: error.requestId ?? req.requestId,
    });
    return;
  }

  logger.error('Unhandled application error', {
    error:
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : error,
    requestId: req.requestId,
  });

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    requestId: req.requestId,
  });
};
