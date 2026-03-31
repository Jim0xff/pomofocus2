import { NextFunction, Request, Response } from "express";
import { validateAccessToken } from "../services/inviteAccessService";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.header("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      const error = new Error("token missing or invalid") as Error & { status?: number; code?: string };
      error.status = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const token = auth.slice("Bearer ".length).trim();
    const ok = await validateAccessToken(token);
    if (!ok) {
      const error = new Error("token missing or invalid") as Error & { status?: number; code?: string };
      error.status = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
}
