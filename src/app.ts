import express from "express";
import { adminInviteRouter } from "./routes/admin/invite";
import { adminRegistrationRouter } from "./routes/admin/registrations";
import { publicRegistrationRouter } from "./routes/public/registrations";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorMiddleware } from "./middleware/error";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.get("/health", (_req, res) => res.json({ code: "OK", message: "alive", requestId: res.locals.requestId }));

  app.use("/api/v1", publicRegistrationRouter);
  app.use("/api/v1", adminInviteRouter);
  app.use("/api/v1", adminRegistrationRouter);

  app.use(errorMiddleware);
  return app;
}
