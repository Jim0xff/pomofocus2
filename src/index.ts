import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { AppDataSource } from './db.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import signupRoutes from './routes/signups.js';

async function bootstrap() {
  await AppDataSource.initialize();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.use(config.apiBasePath, signupRoutes);

  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`signup backend listening on :${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
