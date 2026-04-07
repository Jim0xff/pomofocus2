import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DATABASE_TYPE = 'sqljs';
process.env.ADMIN_AUTH_TOKEN = 'test-admin-token';

const { createApolloAppServer } = await import('../dist/app.js');
const { destroyDatabase, getDataSource, resetDatabase } = await import('../dist/infra/datasource.js');
const { errorHandler } = await import('../dist/infra/errorHandler.js');
const { withRequestId } = await import('../dist/infra/logger.js');

async function createServer() {
  await resetDatabase();
  return createApolloAppServer();
}

async function execute(server, query, variables = {}, token) {
  const response = await server.executeOperation(
    { query, variables },
    {
      contextValue: {
        req: {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        },
        requestId: 'test-request-id',
        user: token === 'test-admin-token' ? { id: 'admin', role: 'admin' } : null,
      },
    },
  );

  assert.equal(response.body.kind, 'single');
  return response.body.singleResult;
}

async function startHttpServer(app) {
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  return server;
}

async function createHttpApp() {
  const { app, server } = await createServer();
  const httpServer = await startHttpServer(app);
  const address = httpServer.address();
  assert.ok(address && typeof address === 'object');

  return {
    graphqlServer: server,
    httpServer,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function closeHttpApp({ graphqlServer, httpServer }) {
  await graphqlServer.stop();
  await new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function apiRequest(baseUrl, path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set('x-request-id', headers.get('x-request-id') ?? 'test-request-id');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  return {
    response,
    payload: await response.json(),
  };
}

test.after(async () => {
  await destroyDatabase();
});

test('OBL-01 REST fixed questionnaire returns the step_3 contract', async () => {
  const app = await createHttpApp();
  const { response, payload } = await apiRequest(app.baseUrl, '/api/questionnaires/fixed');

  assert.equal(response.status, 200);
  assert.equal(payload.code, 0);
  assert.equal(payload.message, 'ok');
  assert.equal(payload.requestId, 'test-request-id');
  assert.equal(payload.data.questionnaireId, 'survey-fixed-v1');
  assert.deepEqual(
    payload.data.questions.map((question) => question.type),
    ['text', 'textarea'],
  );

  await closeHttpApp(app);
});

test('OBL-02 REST submit persists and returns stable fields', async () => {
  const app = await createHttpApp();
  const { response, payload } = await apiRequest(app.baseUrl, '/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      questionnaireId: 'survey-fixed-v1',
      answers: [
        { questionId: 'q1', answerText: 'Dashboard' },
        { questionId: 'q2', answerText: 'More export options' },
      ],
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(payload.code, 0);
  assert.equal(payload.message, 'created');
  assert.equal(payload.requestId, 'test-request-id');
  assert.match(payload.data.submissionId, /^sub_/);
  assert.equal(payload.data.questionnaireId, 'survey-fixed-v1');
  assert.equal(payload.data.answers.length, 2);

  await closeHttpApp(app);
});

test('OBL-02 and OBL-05 REST invalid answers return 4001003 with requestId', async () => {
  const app = await createHttpApp();
  const { response, payload } = await apiRequest(app.baseUrl, '/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      questionnaireId: 'survey-fixed-v1',
      answers: [{ questionId: 'q1', answerText: '   ' }],
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(payload.code, 4001003);
  assert.equal(payload.message, 'INVALID_ANSWERS');
  assert.equal(payload.requestId, 'test-request-id');
  assert.equal(payload.data, null);
  assert.equal(payload.details.reason, 'required question cannot be empty');

  await closeHttpApp(app);
});

test('OBL-03 REST admin submissions requires auth and returns submittedAt DESC', async () => {
  const app = await createHttpApp();

  await apiRequest(app.baseUrl, '/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      questionnaireId: 'survey-fixed-v1',
      answers: [{ questionId: 'q1', answerText: 'First' }],
    }),
  });

  await new Promise((resolve) => setTimeout(resolve, 5));

  const secondSubmission = await apiRequest(app.baseUrl, '/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      questionnaireId: 'survey-fixed-v1',
      answers: [{ questionId: 'q1', answerText: 'Second' }],
    }),
  });

  const unauthenticated = await apiRequest(app.baseUrl, '/api/admin/submissions');

  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.payload.code, 4011001);
  assert.equal(unauthenticated.payload.message, 'UNAUTHORIZED');
  assert.equal(unauthenticated.payload.requestId, 'test-request-id');

  const authenticated = await apiRequest(app.baseUrl, '/api/admin/submissions?page=1&pageSize=20', {
    headers: {
      authorization: 'Bearer test-admin-token',
    },
  });

  assert.equal(authenticated.response.status, 200);

  const graphqlResult = await execute(
    app.graphqlServer,
    `query {
      adminSurveySubmissions(page: 1, pageSize: 20) {
        code
        data {
          total
        }
      }
    }`,
    {},
    'test-admin-token',
  );

  const queryPlan = await getDataSource().query(
    `EXPLAIN QUERY PLAN
     SELECT "SurveySubmission"."id" AS "SurveySubmission_id"
     FROM "surveySubmissions" "SurveySubmission"
     ORDER BY "SurveySubmission"."submittedAt" DESC, "SurveySubmission"."id" DESC
     LIMIT 20 OFFSET 0`,
  );
  const planDetail = queryPlan.map((row) => row.detail).join(' | ');

  assert.equal(graphqlResult.data.adminSurveySubmissions.code, 0);
  assert.equal(authenticated.payload.code, 0);
  assert.equal(authenticated.payload.data.total, 2);
  assert.match(planDetail, /idxSurveySubmissionsSubmittedAtDesc/);
  assert.match(planDetail, /SCAN .* USING (?:COVERING )?INDEX idxSurveySubmissionsSubmittedAtDesc/);
  assert.equal(
    authenticated.payload.data.items[0].submissionId,
    secondSubmission.payload.data.submissionId,
  );
  assert.equal(authenticated.payload.data.items[0].answers[0].answerText, 'Second');

  await closeHttpApp(app);
});

test('OBL-04 REST admin submission detail returns detail and 4041001 on miss', async () => {
  const app = await createHttpApp();

  const created = await apiRequest(app.baseUrl, '/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      questionnaireId: 'survey-fixed-v1',
      answers: [{ questionId: 'q1', answerText: 'Detail target' }],
    }),
  });

  const found = await apiRequest(app.baseUrl, `/api/admin/submissions/${created.payload.data.submissionId}`, {
    headers: {
      authorization: 'Bearer test-admin-token',
    },
  });

  assert.equal(found.response.status, 200);
  assert.equal(found.payload.code, 0);
  assert.equal(found.payload.data.submissionId, created.payload.data.submissionId);
  assert.equal(found.payload.data.answers[0].answerText, 'Detail target');

  const missing = await apiRequest(app.baseUrl, '/api/admin/submissions/sub_missing', {
    headers: {
      authorization: 'Bearer test-admin-token',
    },
  });

  assert.equal(missing.response.status, 404);
  assert.equal(missing.payload.code, 4041001);
  assert.equal(missing.payload.message, 'SUBMISSION_NOT_FOUND');
  assert.equal(missing.payload.requestId, 'test-request-id');
  assert.equal(missing.payload.data, null);

  await closeHttpApp(app);
});

test('OBL-05 REST 500 error envelope includes code message and requestId', async () => {
  const app = express();

  app.use((req, res, next) => {
    const requestId = 'rest-test-request-id';
    req.headers['x-request-id'] = requestId;

    withRequestId(requestId, () => {
      next();
    });
  });

  app.get('/boom', (req, res, next) => {
    next(new Error('unexpected failure'));
  });

  app.use(errorHandler);

  const server = await startHttpServer(app);
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/boom`);
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.code, 5001000);
  assert.equal(payload.message, 'INTERNAL_ERROR');
  assert.equal(payload.requestId, 'rest-test-request-id');
  assert.equal(payload.data, null);

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});
