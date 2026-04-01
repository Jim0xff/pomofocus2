const { createApp } = require('./app');
const config = require('./config');
const { createDatabaseConnection, createSignupRepository } = require('./db');

const db = createDatabaseConnection(config.dbPath);
const signupRepository = createSignupRepository(db);
const app = createApp({ signupRepository, adminToken: config.adminToken });

const server = app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
