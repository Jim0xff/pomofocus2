import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';

import { DatabaseSync } from 'node:sqlite';

import { createApp, ROUTES } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { createResponseRepository } from '../src/repository.js';
import { createSurveyService } from '../src/service.js';

const ADMIN_API_TOKEN = 'admin-secret-token';
const ADMIN_READONLY_TOKEN = 'readonly-secret-token';

async function withTestServer(run, { env = {} } = {}) {
  const tempDir = mkdtempSync(join(tmpdir(), 'survey-jim2-'));
  const databasePath = join(tempDir, 'test.sqlite');
  const database = createDatabase(databasePath);
  const repository = createResponseRepository(database);
  const service = createSurveyService(repository);
  const app = createApp(service);
  const server = createServer(app);
  const previousEnv = {};

  for (const [key, value] of Object.entries(env)) {
    previousEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run({
      baseUrl,
      databasePath,
      repository,
    });
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );

    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function adminHeaders(token = ADMIN_API_TOKEN) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function seedResponse(repository, responseId, submittedAt, answers) {
  repository.saveResponse({
    response_id: responseId,
    submitted_at: submittedAt,
    answers,
  });
}

test('GET /api/v1/survey returns fixed survey contract', async () => {
  await withTestServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/survey`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        questions: [
          {
            question_id: 'q_name',
            title: '你的姓名是？',
            type: 'text',
            required: true,
            order: 1,
          },
          {
            question_id: 'q_feedback',
            title: '你最想改进的点是什么？',
            type: 'multiline',
            required: false,
            order: 2,
          },
        ],
      },
    });
  });
});

test('POST /api/v1/responses persists a valid submission', async () => {
  await withTestServer(async ({ baseUrl, repository, databasePath }) => {
    const payload = {
      answers: [
        { question_id: 'q_name', answer_text: 'Jim' },
        { question_id: 'q_feedback', answer_text: '希望支持导出能力。' },
      ],
    };

    const response = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.match(body.data.response_id, /^[0-9a-f-]{36}$/);
    assert.match(body.data.submitted_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(body.data.message, '提交成功');
    assert.equal(repository.countResponses(), 1);
    assert.equal(repository.countAnswers(), 2);

    const database = new DatabaseSync(databasePath);
    const answers = database
      .prepare(
        'SELECT question_id, answer_text FROM survey_response_answer ORDER BY question_id ASC',
      )
      .all()
      .map((row) => ({ ...row }));
    database.close();

    assert.deepEqual(answers, [
      { question_id: 'q_feedback', answer_text: '希望支持导出能力。' },
      { question_id: 'q_name', answer_text: 'Jim' },
    ]);
  });
});

test('POST /api/v1/responses rejects missing required answers', async () => {
  await withTestServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [{ question_id: 'q_feedback', answer_text: 'Optional only' }],
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.match(body.error.message, /required question q_name is missing/);
    assert.equal(body.error.details, null);
    assert.ok(body.error.request_id);
  });
});

test('POST /api/v1/responses rejects blank required answers', async () => {
  await withTestServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [{ question_id: 'q_name', answer_text: '   ' }],
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.request_id);
  });
});

test('POST /api/v1/responses rejects invalid and duplicate question ids', async () => {
  await withTestServer(async ({ baseUrl }) => {
    const invalidResponse = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [{ question_id: 'q_unknown', answer_text: 'x' }],
      }),
    });
    const invalidBody = await invalidResponse.json();

    assert.equal(invalidResponse.status, 400);
    assert.equal(invalidBody.error.code, 'VALIDATION_ERROR');

    const duplicateResponse = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [
          { question_id: 'q_name', answer_text: 'Jim' },
          { question_id: 'q_name', answer_text: 'James' },
        ],
      }),
    });
    const duplicateBody = await duplicateResponse.json();

    assert.equal(duplicateResponse.status, 400);
    assert.equal(duplicateBody.error.code, 'VALIDATION_ERROR');
    assert.match(duplicateBody.error.message, /duplicated/);
  });
});

test('POST /api/v1/responses allows duplicate submissions with the same payload', async () => {
  await withTestServer(async ({ baseUrl, repository }) => {
    const payload = {
      answers: [
        { question_id: 'q_name', answer_text: 'Jim' },
        { question_id: 'q_feedback', answer_text: '' },
      ],
    };

    const firstResponse = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const secondResponse = await fetch(`${baseUrl}/api/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(repository.countResponses(), 2);
    assert.equal(repository.countAnswers(), 4);
  });
});

test('GET /api/v1/admin/responses returns paginated response summaries', async () => {
  await withTestServer(
    async ({ baseUrl, repository }) => {
      seedResponse(repository, 'resp-list-001', '2026-04-02T10:00:00.000Z', [
        { question_id: 'q_name', answer_text: 'Alice' },
        { question_id: 'q_feedback', answer_text: 'Alpha' },
      ]);
      seedResponse(repository, 'resp-list-002', '2026-04-02T11:00:00.000Z', [
        { question_id: 'q_name', answer_text: 'Bob' },
        { question_id: 'q_feedback', answer_text: 'Beta' },
      ]);
      seedResponse(repository, 'resp-list-003', '2026-04-02T12:00:00.000Z', [
        { question_id: 'q_name', answer_text: 'Cara' },
        { question_id: 'q_feedback', answer_text: 'Gamma' },
      ]);

      const response = await fetch(`${baseUrl}/api/v1/admin/responses?page=1&page_size=2`, {
        headers: adminHeaders(),
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(body, {
        success: true,
        data: {
          items: [
            {
              response_id: 'resp-list-003',
              submitted_at: '2026-04-02T12:00:00.000Z',
            },
            {
              response_id: 'resp-list-002',
              submitted_at: '2026-04-02T11:00:00.000Z',
            },
          ],
          page: 1,
          page_size: 2,
          total: 3,
        },
      });
    },
    {
      env: {
        ADMIN_API_TOKEN,
        ADMIN_READONLY_TOKEN,
      },
    },
  );
});

test('GET /api/v1/admin/responses rejects invalid pagination', async () => {
  await withTestServer(
    async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/api/v1/admin/responses?page=0`, {
        headers: adminHeaders(),
      });
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.request_id);
    },
    {
      env: {
        ADMIN_API_TOKEN,
      },
    },
  );
});

test('GET /api/v1/admin/responses/{response_id} returns full response detail', async () => {
  await withTestServer(
    async ({ baseUrl, repository }) => {
      seedResponse(repository, 'resp-detail-001', '2026-04-02T13:00:00.000Z', [
        { question_id: 'q_name', answer_text: 'Dora' },
        { question_id: 'q_feedback', answer_text: 'Need exports later' },
      ]);

      const response = await fetch(`${baseUrl}/api/v1/admin/responses/resp-detail-001`, {
        headers: adminHeaders(),
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(body, {
        success: true,
        data: {
          response_id: 'resp-detail-001',
          submitted_at: '2026-04-02T13:00:00.000Z',
          answers: [
            {
              question_id: 'q_name',
              title: '你的姓名是？',
              type: 'text',
              required: true,
              order: 1,
              answer_text: 'Dora',
            },
            {
              question_id: 'q_feedback',
              title: '你最想改进的点是什么？',
              type: 'multiline',
              required: false,
              order: 2,
              answer_text: 'Need exports later',
            },
          ],
        },
      });
    },
    {
      env: {
        ADMIN_API_TOKEN,
      },
    },
  );
});

test('GET /api/v1/admin/responses/{response_id} returns not found for missing response', async () => {
  await withTestServer(
    async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/api/v1/admin/responses/resp-missing-001`, {
        headers: adminHeaders(),
      });
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
      assert.ok(body.error.request_id);
    },
    {
      env: {
        ADMIN_API_TOKEN,
      },
    },
  );
});

test('admin repository queries support seeded list and detail reads', async () => {
  await withTestServer(async ({ repository }) => {
    seedResponse(repository, 'resp-db-001', '2026-04-02T09:00:00.000Z', [
      { question_id: 'q_name', answer_text: 'Eve' },
      { question_id: 'q_feedback', answer_text: 'Delta' },
    ]);
    seedResponse(repository, 'resp-db-002', '2026-04-02T10:00:00.000Z', [
      { question_id: 'q_name', answer_text: 'Finn' },
      { question_id: 'q_feedback', answer_text: 'Epsilon' },
    ]);

    const list = repository.listResponses({ page: 1, page_size: 20 });
    const detail = repository.getResponseDetail('resp-db-002');

    assert.deepEqual(list, {
      items: [
        { response_id: 'resp-db-002', submitted_at: '2026-04-02T10:00:00.000Z' },
        { response_id: 'resp-db-001', submitted_at: '2026-04-02T09:00:00.000Z' },
      ],
      page: 1,
      page_size: 20,
      total: 2,
    });
    assert.deepEqual(detail, {
      response_id: 'resp-db-002',
      submitted_at: '2026-04-02T10:00:00.000Z',
      answers: [
        { question_id: 'q_feedback', answer_text: 'Epsilon' },
        { question_id: 'q_name', answer_text: 'Finn' },
      ],
    });
  });
});

test('admin auth requires an authorization header', async () => {
  await withTestServer(
    async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/api/v1/admin/responses`);
      const body = await response.json();

      assert.equal(response.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'AUTH_REQUIRED');
      assert.ok(body.error.request_id);
    },
    {
      env: {
        ADMIN_API_TOKEN,
      },
    },
  );
});

test('admin auth rejects malformed or invalid tokens', async () => {
  await withTestServer(
    async ({ baseUrl }) => {
      const malformedResponse = await fetch(`${baseUrl}/api/v1/admin/responses`, {
        headers: {
          Authorization: 'Basic abc123',
        },
      });
      const malformedBody = await malformedResponse.json();

      assert.equal(malformedResponse.status, 401);
      assert.equal(malformedBody.error.code, 'AUTH_INVALID_TOKEN');

      const invalidResponse = await fetch(`${baseUrl}/api/v1/admin/responses`, {
        headers: adminHeaders('wrong-token'),
      });
      const invalidBody = await invalidResponse.json();

      assert.equal(invalidResponse.status, 401);
      assert.equal(invalidBody.error.code, 'AUTH_INVALID_TOKEN');
    },
    {
      env: {
        ADMIN_API_TOKEN,
        ADMIN_READONLY_TOKEN,
      },
    },
  );
});

test('admin auth returns forbidden for readonly token', async () => {
  await withTestServer(
    async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/api/v1/admin/responses`, {
        headers: adminHeaders(ADMIN_READONLY_TOKEN),
      });
      const body = await response.json();

      assert.equal(response.status, 403);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'AUTH_FORBIDDEN');
      assert.ok(body.error.request_id);
    },
    {
      env: {
        ADMIN_API_TOKEN,
        ADMIN_READONLY_TOKEN,
      },
    },
  );
});

test('admin auth allows valid admin token', async () => {
  await withTestServer(
    async ({ baseUrl, repository }) => {
      seedResponse(repository, 'resp-auth-001', '2026-04-02T14:00:00.000Z', [
        { question_id: 'q_name', answer_text: 'Grace' },
      ]);

      const response = await fetch(`${baseUrl}/api/v1/admin/responses`, {
        headers: adminHeaders(),
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.total, 1);
    },
    {
      env: {
        ADMIN_API_TOKEN,
        ADMIN_READONLY_TOKEN,
      },
    },
  );
});

test('phase_2 route inventory excludes edit and export routes', async () => {
  assert.deepEqual(ROUTES, [
    'GET /api/v1/survey',
    'POST /api/v1/responses',
    'GET /api/v1/admin/responses',
    'GET /api/v1/admin/responses/:response_id',
  ]);

  await withTestServer(
    async ({ baseUrl }) => {
      const routes = [
        `${baseUrl}/api/v1/admin/survey`,
        `${baseUrl}/api/v1/admin/responses/resp-001/edit`,
        `${baseUrl}/api/v1/survey/export`,
      ];

      for (const route of routes) {
        const response = await fetch(route, {
          headers: adminHeaders(),
        });
        assert.equal(response.status, 404);
      }
    },
    {
      env: {
        ADMIN_API_TOKEN,
      },
    },
  );
});
