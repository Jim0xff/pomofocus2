import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { initializeDataSource } from './infra/datasource.js';
import { seedSurveyQuestions } from './seed/surveySeed.js';
import { SurveyRepository } from './repositories/surveyRepository.js';
import { SurveyService } from './services/surveyService.js';
import { buildSurveyRoutes } from './routes/surveyRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiSchema } from './schema.js';
import { buildResolvers } from './resolvers.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  const requestId = req.header('x-request-id') || randomUUID();
  res.setHeader('x-request-id', requestId);
  (req as any).requestId = requestId;
  next();
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

async function bootstrap(): Promise<void> {
  const ds = await initializeDataSource();
  await seedSurveyQuestions(ds);

  const surveyRepository = new SurveyRepository(ds);
  const surveyService = new SurveyService(surveyRepository);
  const resolvers = buildResolvers(surveyService);
  void apiSchema;
  void resolvers;

  app.use('/api', buildSurveyRoutes(surveyService));
  app.use(errorHandler);

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`survey-jim12 backend running at http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('bootstrap failed', error);
  process.exit(1);
});
