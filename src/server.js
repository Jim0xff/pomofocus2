import { createServer } from 'node:http';

import { createApp } from './app.js';
import { createDatabase } from './database.js';
import { createResponseRepository } from './repository.js';
import { createSurveyService } from './service.js';

const databasePath = process.env.SURVEY_DB_PATH || 'survey.sqlite';
const port = Number(process.env.PORT || 3000);

const database = createDatabase(databasePath);
const repository = createResponseRepository(database);
const service = createSurveyService(repository);
const app = createApp(service);
const server = createServer(app);

server.listen(port, () => {
  process.stdout.write(`survey-jim2 listening on ${port}\n`);
});
