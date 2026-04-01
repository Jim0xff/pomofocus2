const { createApp } = require('./app');
const { createDatabaseConnection, createSignupRepository } = require('./db');
const { loadConfig } = require('./infra/config-loader');
const { createLogger } = require('./infra/logger');

const config = loadConfig();
const logger = createLogger();
const db = createDatabaseConnection(config.dbPath);
const signupRepository = createSignupRepository(db);
const app = createApp({ signupRepository, adminToken: config.adminToken, logger });

const server = app.listen(config.port, () => {
  logger.info(`Listening on port ${config.port}`, {
    port: config.port,
    dbPath: config.dbPath,
  });
});

function shutdown() {
  server.close(() => {
    db.close();
    logger.info('Server shutdown complete');
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
