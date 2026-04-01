const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function resolveDbPath() {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }

  return path.join(projectRoot, 'data', 'signups.sqlite');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  dbPath: resolveDbPath(),
  adminToken: process.env.ADMIN_TOKEN || 'dev-admin-token',
};
