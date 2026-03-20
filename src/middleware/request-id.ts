import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incomingRequestId = req.header('x-request-id');
  const requestId = incomingRequestId?.trim() || randomUUID();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};
