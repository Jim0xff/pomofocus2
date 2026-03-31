import { NextFunction, Request, Response } from "express";
import { ApiError } from "./types";

export function errorMiddleware(err: ApiError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  const code = err.code ?? "INTERNAL_ERROR";
  const requestId = (res.locals.requestId as string | undefined) ?? "";

  res.status(status).json({
    code,
    message: err.message,
    error: err.detail ?? undefined,
    requestId
  });
}
