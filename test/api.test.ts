import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { initializeDatabase } from '../src/infra/datasource.js';
import { createApp } from '../src/app.js';

let app: any;

test('setup app', async () => {
  await initializeDatabase();
  app = await createApp();
  assert.ok(app);
});

test('OBL-01 questionnaire read', async () => {
  const res = await request(app).get('/api/questionnaire');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.questionnaire_id, 'fixed-survey-v1');
  assert.ok(Array.isArray(res.body.data.questions));
});

test('OBL-02 submit success', async () => {
  const res = await request(app).post('/api/submissions').send({
    questionnaire_id: 'fixed-survey-v1',
    answers: [
      { question_id: 'q_name', answer_value: 'Jim' },
      { question_id: 'q_feedback', answer_value: 'great' }
    ]
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.data.submission_id);
  assert.ok(res.body.data.submitted_at);
});

test('OBL-05 error envelope INVALID_ANSWER', async () => {
  const res = await request(app).post('/api/submissions').send({
    questionnaire_id: 'fixed-survey-v1',
    answers: [{ question_id: 'q_name', answer_value: '' }]
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_ANSWER');
  assert.ok(res.body.error.requestId);
});

test('OBL-03 list desc', async () => {
  const res = await request(app).get('/api/admin/submissions');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data.items));
});

test('OBL-04 detail + 404', async () => {
  const list = await request(app).get('/api/admin/submissions');
  const id = list.body.data.items[0]?.submission_id;
  const ok = await request(app).get(`/api/admin/submissions/${id}`);
  assert.equal(ok.status, 200);
  const miss = await request(app).get('/api/admin/submissions/sub_missing');
  assert.equal(miss.status, 404);
  assert.equal(miss.body.error.code, 'SUBMISSION_NOT_FOUND');
});
