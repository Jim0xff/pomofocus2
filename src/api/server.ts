import express, { type NextFunction, type Request, type Response } from "express";
import { appDataSource } from "../infra/datasource.js";
import { AppError } from "../infra/errors.js";
import { requestIdMiddleware, type RequestWithId } from "../infra/requestId.js";
import { apiRouter } from "./routes.js";
export const createServer = () => {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use("/api", apiRouter);
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = (req as RequestWithId).requestId;
    if (error instanceof AppError) return res.status(error.status).json({ code: error.code, message: error.message, requestId, details: error.details });
    console.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "internal server error", requestId });
  });
  return app;
};
export const startServer = async (): Promise<void> => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to start API server");
  await appDataSource.initialize();
  const app = createServer();
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => console.log(`survey-jim5 backend listening on ${port}`));
};
