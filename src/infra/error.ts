import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) { const requestId = (req.headers['x-request-id'] as string) || randomUUID(); res.setHeader('x-request-id', requestId); (req as any).requestId = requestId; next(); }
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) { const requestId = (req as any).requestId || randomUUID(); const status = err?.status ?? 500; const code = err?.code ?? 'INTERNAL_ERROR'; res.status(status).json({ error: { code, message: err?.message ?? 'unexpected server error', requestId, details: err?.details ?? {} } }); }
