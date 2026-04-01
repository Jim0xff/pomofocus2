const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createDatabaseConnection, createSignupRepository } = require('../src/db');

const ADMIN_TOKEN = 'test-admin-token';
const SIGNUP_NOT_FOUND_ERROR = {
  success: false,
  error: {
    code: 'SIGNUP_NOT_FOUND',
    message: 'Signup not found.',
  },
};
const FORBIDDEN_ERROR = {
  success: false,
  error: {
    code: 'FORBIDDEN',
    message: 'Admin access is required.',
  },
};

function buildTestApp() {
  const db = createDatabaseConnection(':memory:');
  const signupRepository = createSignupRepository(db);
  const app = createApp({ signupRepository, adminToken: ADMIN_TOKEN });

  return { app, db };
}

async function createSignup(app, overrides = {}) {
  const payload = {
    signupType: 'individual',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+1234567890',
    projectName: 'Analytical Engine',
    projectIntro: 'A programmable computing platform for hackathon teams.',
    ...overrides,
  };

  return request(app).post('/api/signups').send(payload);
}

function assertValidationError(response, expectedFields) {
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.message, 'Request validation failed.');
  assert.deepEqual(
    response.body.error.details.map((detail) => detail.field).sort(),
    expectedFields.slice().sort()
  );
}

test('POST /api/signups creates a pending signup with S3 response shape', async () => {
  const { app, db } = buildTestApp();

  try {
    const response = await createSignup(app, {
      signupType: 'team',
      email: 'TEAM@example.com',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.signupType, 'team');
    assert.equal(response.body.data.email, 'team@example.com');
    assert.equal(response.body.data.status, 'pending');
    assert.ok(response.body.data.id);
    assert.ok(response.body.data.createdAt);
    assert.ok(response.body.data.updatedAt);
  } finally {
    db.close();
  }
});

test('POST /api/signups rejects invalid signup type with INVALID_SIGNUP_TYPE', async () => {
  const { app, db } = buildTestApp();

  try {
    const response = await createSignup(app, { signupType: 'duo' });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      success: false,
      error: {
        code: 'INVALID_SIGNUP_TYPE',
        message: 'Signup type must be individual or team.',
      },
    });
  } finally {
    db.close();
  }
});

test('GET /api/admin/signups requires the admin token header', async () => {
  const { app, db } = buildTestApp();

  try {
    const response = await request(app).get('/api/admin/signups');

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, FORBIDDEN_ERROR);
  } finally {
    db.close();
  }
});

test('GET /api/admin/signups returns paginated results and supports status filter', async () => {
  const { app, db } = buildTestApp();

  try {
    const createdA = await createSignup(app, {
      name: 'Ada Lovelace',
      email: 'ada1@example.com',
      projectName: 'Project A',
    });
    const createdB = await createSignup(app, {
      signupType: 'team',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      projectName: 'Project B',
    });
    const createdC = await createSignup(app, {
      name: 'Margaret Hamilton',
      email: 'margaret@example.com',
      projectName: 'Project C',
    });

    await request(app)
      .patch(`/api/admin/signups/${createdB.body.data.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'approved' })
      .expect(200);

    await request(app)
      .patch(`/api/admin/signups/${createdC.body.data.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'rejected' })
      .expect(200);

    const pagedResponse = await request(app)
      .get('/api/admin/signups?page=1&size=2')
      .set('x-admin-token', ADMIN_TOKEN);

    assert.equal(pagedResponse.status, 200);
    assert.equal(pagedResponse.body.success, true);
    assert.equal(pagedResponse.body.data.total, 3);
    assert.equal(pagedResponse.body.data.page, 1);
    assert.equal(pagedResponse.body.data.size, 2);
    assert.equal(pagedResponse.body.data.items.length, 2);
    assert.deepEqual(
      pagedResponse.body.data.items.map((item) => item.id),
      [createdC.body.data.id, createdB.body.data.id]
    );

    const filteredResponse = await request(app)
      .get('/api/admin/signups?page=1&size=20&status=approved')
      .set('x-admin-token', ADMIN_TOKEN);

    assert.equal(filteredResponse.status, 200);
    assert.deepEqual(filteredResponse.body.data.items.map((item) => item.status), ['approved']);
    assert.equal(filteredResponse.body.data.total, 1);
    assert.equal(filteredResponse.body.data.items[0].id, createdB.body.data.id);

    assert.ok(createdA.body.data.id);
  } finally {
    db.close();
  }
});

test('GET /api/admin/signups/:id returns signup details', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      signupType: 'team',
      name: 'Katherine Johnson',
      email: 'katherine@example.com',
    });

    const response = await request(app)
      .get(`/api/admin/signups/${created.body.data.id}`)
      .set('x-admin-token', ADMIN_TOKEN);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, created.body.data.id);
    assert.equal(response.body.data.signupType, 'team');
    assert.equal(response.body.data.name, 'Katherine Johnson');
    assert.equal(response.body.data.email, 'katherine@example.com');
    assert.equal(response.body.data.phone, '+1234567890');
    assert.equal(response.body.data.projectName, 'Analytical Engine');
    assert.equal(
      response.body.data.projectIntro,
      'A programmable computing platform for hackathon teams.'
    );
    assert.equal(response.body.data.status, 'pending');
    assert.ok(response.body.data.createdAt);
    assert.ok(response.body.data.updatedAt);
  } finally {
    db.close();
  }
});

test('PATCH /api/admin/signups/:id/status updates signup status', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      email: 'status@example.com',
    });

    const response = await request(app)
      .patch(`/api/admin/signups/${created.body.data.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'approved' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.success, true);
    assert.equal(response.body.data.id, created.body.data.id);
    assert.equal(response.body.data.status, 'approved');
    assert.ok(response.body.data.updatedAt);

    const detailResponse = await request(app)
      .get(`/api/admin/signups/${created.body.data.id}`)
      .set('x-admin-token', ADMIN_TOKEN);

    assert.equal(detailResponse.body.data.status, 'approved');
  } finally {
    db.close();
  }
});

test('PATCH /api/admin/signups/:id/status rejects invalid status values', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      email: 'invalid-status@example.com',
    });

    const response = await request(app)
      .patch(`/api/admin/signups/${created.body.data.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'archived' });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: 'Status must be pending, approved, or rejected.',
      },
    });
  } finally {
    db.close();
  }
});

test('concurrent status updates keep responses valid and reads stable for the current MVP', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      email: 'concurrent@example.com',
    });
    const signupId = created.body.data.id;

    const operations = await Promise.all([
      request(app)
        .patch(`/api/admin/signups/${signupId}/status`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ status: 'approved' }),
      request(app)
        .patch(`/api/admin/signups/${signupId}/status`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ status: 'rejected' }),
      request(app)
        .get(`/api/admin/signups/${signupId}`)
        .set('x-admin-token', ADMIN_TOKEN),
      request(app)
        .get(`/api/admin/signups/${signupId}`)
        .set('x-admin-token', ADMIN_TOKEN),
      request(app)
        .get('/api/admin/signups?page=1&size=10')
        .set('x-admin-token', ADMIN_TOKEN),
    ]);

    const [approvedUpdate, rejectedUpdate, detailA, detailB, listResponse] = operations;

    for (const response of [approvedUpdate, rejectedUpdate]) {
      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.id, signupId);
      assert.ok(['approved', 'rejected'].includes(response.body.data.status));
      assert.ok(response.body.data.updatedAt);
    }

    for (const response of [detailA, detailB]) {
      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.id, signupId);
      assert.ok(['pending', 'approved', 'rejected'].includes(response.body.data.status));
      assert.ok(response.body.data.createdAt);
      assert.ok(response.body.data.updatedAt);
    }

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.success, true);
    assert.equal(listResponse.body.data.items.length, 1);
    assert.equal(listResponse.body.data.items[0].id, signupId);
    assert.ok(['pending', 'approved', 'rejected'].includes(listResponse.body.data.items[0].status));

    const finalDetail = await request(app)
      .get(`/api/admin/signups/${signupId}`)
      .set('x-admin-token', ADMIN_TOKEN);

    assert.equal(finalDetail.status, 200);
    assert.ok(['approved', 'rejected'].includes(finalDetail.body.data.status));
  } finally {
    db.close();
  }
});

test('non-scope export, notification, and deadline endpoints remain unavailable', async () => {
  const { app, db } = buildTestApp();

  try {
    const responses = await Promise.all([
      request(app)
        .get('/api/admin/signups/export')
        .set('x-admin-token', ADMIN_TOKEN),
      request(app)
        .post('/api/admin/notifications/send')
        .set('x-admin-token', ADMIN_TOKEN),
      request(app)
        .get('/api/admin/deadlines'),
      request(app).get('/api/signups/export'),
    ]);

    assert.deepEqual(
      responses.map((response) => response.status),
      [404, 404, 403, 404]
    );

    assert.deepEqual(responses[0].body, SIGNUP_NOT_FOUND_ERROR);
    assert.equal(responses[1].body.error.code, 'NOT_FOUND');
    assert.deepEqual(responses[2].body, FORBIDDEN_ERROR);
    assert.equal(responses[3].body.error.code, 'NOT_FOUND');
  } finally {
    db.close();
  }
});

test('VALIDATION_ERROR responses stay consistent across create, list, and status update flows', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      email: 'validation-consistency@example.com',
    });

    const createResponse = await request(app).post('/api/signups').send({});
    assertValidationError(createResponse, [
      'signupType',
      'name',
      'email',
      'phone',
      'projectName',
      'projectIntro',
    ]);

    const listResponse = await request(app)
      .get('/api/admin/signups?page=0&size=500&status=archived')
      .set('x-admin-token', ADMIN_TOKEN);
    assertValidationError(listResponse, ['page', 'size', 'status']);

    const patchResponse = await request(app)
      .patch(`/api/admin/signups/${created.body.data.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({});
    assertValidationError(patchResponse, ['status']);
  } finally {
    db.close();
  }
});

test('FORBIDDEN responses stay consistent across admin endpoints', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      email: 'forbidden-consistency@example.com',
    });

    const responses = await Promise.all([
      request(app).get('/api/admin/signups'),
      request(app).get(`/api/admin/signups/${created.body.data.id}`),
      request(app).patch(`/api/admin/signups/${created.body.data.id}/status`).send({ status: 'approved' }),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 403);
      assert.deepEqual(response.body, FORBIDDEN_ERROR);
    }
  } finally {
    db.close();
  }
});

test('SIGNUP_NOT_FOUND responses stay consistent for missing and invalid ids', async () => {
  const { app, db } = buildTestApp();

  try {
    const responses = await Promise.all([
      request(app)
        .get('/api/admin/signups/9999')
        .set('x-admin-token', ADMIN_TOKEN),
      request(app)
        .patch('/api/admin/signups/9999/status')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ status: 'approved' }),
      request(app)
        .get('/api/admin/signups/not-a-number')
        .set('x-admin-token', ADMIN_TOKEN),
      request(app)
        .patch('/api/admin/signups/0/status')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ status: 'rejected' }),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 404);
      assert.deepEqual(response.body, SIGNUP_NOT_FOUND_ERROR);
    }
  } finally {
    db.close();
  }
});

test('INVALID_STATUS stays consistent even when the signup id is missing', async () => {
  const { app, db } = buildTestApp();

  try {
    const created = await createSignup(app, {
      email: 'invalid-status-consistency@example.com',
    });

    const existingResponse = await request(app)
      .patch(`/api/admin/signups/${created.body.data.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'archived' });

    const missingResponse = await request(app)
      .patch('/api/admin/signups/9999/status')
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'archived' });

    for (const response of [existingResponse, missingResponse]) {
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be pending, approved, or rejected.',
        },
      });
    }
  } finally {
    db.close();
  }
});

test('schema initialization creates the S2 constraints and indexes', () => {
  const db = createDatabaseConnection(':memory:');

  try {
    const columns = db.prepare(`PRAGMA table_info(signups)`).all();
    assert.deepEqual(
      columns.map((column) => column.name),
      [
        'id',
        'signup_type',
        'name',
        'email',
        'phone',
        'project_name',
        'project_intro',
        'status',
        'created_at',
        'updated_at',
      ]
    );

    const createTableSql = db
      .prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'signups'
      `)
      .get().sql;

    assert.match(createTableSql, /CHECK \(signup_type IN \('individual', 'team'\)\)/);
    assert.match(
      createTableSql,
      /CHECK \(status IN \('pending', 'approved', 'rejected'\)\)/
    );

    const indexes = db.prepare(`PRAGMA index_list(signups)`).all();
    assert.deepEqual(
      indexes.map((index) => index.name).sort(),
      ['idx_signups_created_at', 'idx_signups_status_created_at']
    );
  } finally {
    db.close();
  }
});
