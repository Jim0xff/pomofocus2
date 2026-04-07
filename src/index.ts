import 'reflect-metadata';
import { PORT } from './infra/constants.js';
import { logger } from './infra/logger.js';
import { startHttpServer } from './app.js';

const { httpServer } = await startHttpServer();

httpServer.listen(PORT, () => {
  logger.info('Survey GraphQL server listening on port %s', PORT);
});
