const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

function resolvePort(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
}

function resolveDbPath(env) {
  if (env.DB_PATH) {
    return path.resolve(env.DB_PATH);
  }

  return path.join(projectRoot, 'data', 'signups.sqlite');
}

function loadConfig(env = process.env) {
  return {
    port: resolvePort(env.PORT),
    dbPath: resolveDbPath(env),
    adminToken: env.ADMIN_TOKEN || 'dev-admin-token',
    logLevel: env.LOG_LEVEL || 'info',
  };
}

module.exports = {
  loadConfig,
};
