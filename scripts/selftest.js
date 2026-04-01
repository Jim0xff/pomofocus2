const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createDatabaseConnection, createSignupRepository } = require('../src/db');
const { createLogger } = require('../src/infra/logger');

async function main() {
  const db = createDatabaseConnection(':memory:');
  const signupRepository = createSignupRepository(db);
  const logger = createLogger({
    sink: {
      log() {},
      warn() {},
      error() {},
    },
  });
  const app = createApp({
    signupRepository,
    adminToken: 'selftest-admin-token',
    logger,
  });

  try {
    const healthResponse = await request(app).get('/health');
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(healthResponse.body, {
      success: true,
      data: { status: 'ok' },
    });

    const createResponse = await request(app).post('/api/signups').send({
      signupType: 'individual',
      name: 'Self Test',
      email: 'selftest@example.com',
      phone: '+15551234567',
      projectName: 'Harness Check',
      projectIntro: 'Confirms the runtime wiring remains executable.',
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.success, true);
    assert.equal(createResponse.body.data.status, 'pending');
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
