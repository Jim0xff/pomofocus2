import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
export interface RequestWithId extends Request { requestId: string; }
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.header("x-request-id") ?? randomUUID()).toString();
  (req as RequestWithId).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};
