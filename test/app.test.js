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

async function withTestServer(run) {
  const tempDir = mkdtempSync(join(tmpdir(), 'survey-jim2-'));
  const databasePath = join(tempDir, 'test.sqlite');
  const database = createDatabase(databasePath);
  const repository = createResponseRepository(database);
  const service = createSurveyService(repository);
  const app = createApp(service);
  const server = createServer(app);

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
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('GET /api/v1/survey returns fixed survey contract', async () => {
  await withTestServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/survey`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.questions, [
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
    ]);
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

test('phase_1 excludes admin, edit, and export routes', async () => {
  assert.deepEqual(ROUTES, ['GET /api/v1/survey', 'POST /api/v1/responses']);

  await withTestServer(async ({ baseUrl }) => {
    const routes = [
      `${baseUrl}/api/v1/admin/responses`,
      `${baseUrl}/api/v1/admin/responses/123`,
      `${baseUrl}/api/v1/survey/export`,
    ];

    for (const route of routes) {
      const response = await fetch(route);
      assert.equal(response.status, 404);
    }
  });
});
