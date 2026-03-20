const assert = require('node:assert/strict');
const test = require('node:test');

const { loadEnv } = require('../src/config/env.ts');
const { AppError } = require('../src/errors/app-error.ts');

test('loadEnv returns sensible defaults for scaffold startup', () => {
  const env = loadEnv({});

  assert.equal(env.appName, 'pomofocus2-backend');
  assert.equal(env.port, 4000);
  assert.equal(env.graphqlPath, '/graphql');
  assert.equal(env.enableDbOnBoot, false);
  assert.equal(env.enableRedisOnBoot, false);
});

test('loadEnv enforces boot-time infrastructure requirements', () => {
  assert.throws(
    () =>
      loadEnv({
        ENABLE_DB_ON_BOOT: 'true',
      }),
    /DATABASE_URL is required/,
  );

  assert.throws(
    () =>
      loadEnv({
        ENABLE_REDIS_ON_BOOT: 'true',
      }),
    /REDIS_URL is required/,
  );
});

test('AppError preserves status, code, and request context', () => {
  const appError = new AppError('APP_ERROR', 'Application error', {
    details: { scope: 'scaffold' },
    requestId: 'req-1',
    statusCode: 500,
  });

  assert.equal(appError.code, 'APP_ERROR');
  assert.equal(appError.requestId, 'req-1');
  assert.deepEqual(appError.details, { scope: 'scaffold' });
});
