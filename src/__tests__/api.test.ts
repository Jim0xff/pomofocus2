import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { initializeDatabase } from '../infra/datasource.js';
import { createApp } from '../app.js';
import { explainListQueryPlan } from '../services/surveyService.js';

await initializeDatabase();
const app = createApp();

test('GET /api/questionnaire returns fixed survey', async () => {
  const res = await request(app).get('/api/questionnaire').expect(200);
  assert.equal(res.body.data.questionnaire_id, 'fixed-survey-v1');
});

test('POST/list/detail contract flow', async () => {
  const create = await request(app)
    .post('/api/responses')
    .send({ questionnaire_id: 'fixed-survey-v1', answers: [{ question_id: 'q_name', answer: 'Jim' }] })
    .expect(201);
  assert.ok(create.body.data.response_id);

  const list = await request(app).get('/api/admin/responses').expect(200);
  assert.ok(Array.isArray(list.body.data.items));

  const detail = await request(app).get(`/api/admin/responses/${create.body.data.response_id}`).expect(200);
  assert.equal(detail.body.data.response_id, create.body.data.response_id);
});

test('error model includes requestId and code', async () => {
  const res = await request(app)
    .post('/api/responses')
    .send({ questionnaire_id: 'bad', answers: [] })
    .expect(400);
  assert.equal(res.body.error.code, 'INVALID_QUESTIONNAIRE');
  assert.ok(res.body.error.requestId);
});

test('concurrent submissions produce unique response_id and remain list-visible', async () => {
  const jobs = Array.from({ length: 8 }).map((_, i) =>
    request(app)
      .post('/api/responses')
      .send({ questionnaire_id: 'fixed-survey-v1', answers: [{ question_id: 'q_name', answer: `u-${i}` }] })
      .expect(201)
  );
  const all = await Promise.all(jobs);
  const ids = all.map((r) => r.body.data.response_id);
  assert.equal(new Set(ids).size, ids.length);

  const list = await request(app).get('/api/admin/responses?page=1&page_size=50').expect(200);
  const listed = new Set(list.body.data.items.map((x: any) => x.response_id));
  ids.forEach((id) => assert.ok(listed.has(id)));
});

test('list query uses submittedAt index plan evidence', async () => {
  const plan = await explainListQueryPlan();
  const planText = JSON.stringify(plan);
  assert.match(planText, /idxSurveyResponseSubmittedAt|USING INDEX/i);
});

test('detail not found returns RESPONSE_NOT_FOUND', async () => {
  const res = await request(app).get('/api/admin/responses/rsp_not_exist').expect(404);
  assert.equal(res.body.error.code, 'RESPONSE_NOT_FOUND');
  assert.ok(res.body.error.requestId);
});

test('invalid page_size returns INVALID_REQUEST', async () => {
  const res = await request(app).get('/api/admin/responses?page=1&page_size=101').expect(400);
  assert.equal(res.body.error.code, 'INVALID_REQUEST');
});

test('internal 500 envelope includes requestId', async () => {
  const res = await request(app).get('/api/__test__/panic').expect(500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(res.body.error.requestId);
});
