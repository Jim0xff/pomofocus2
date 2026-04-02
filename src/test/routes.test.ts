import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSurveyRouter } from '../routes/surveyRoutes.js';
import { errorHandler } from '../infra/errorHandler.js';

const fakeService = {
  async create() {
    return {
      id: 'subm_1',
      questionnaire_id: 'fixed-survey-v1',
      answers: { q1: 'Jim', q2: 'Hello' },
      submitted_at: '2026-04-02T00:00:00Z',
      submitter_meta: null
    };
  },
  async list() {
    return [
      {
        id: 'subm_1',
        questionnaire_id: 'fixed-survey-v1',
        answers: { q1: 'Jim', q2: 'Hello' },
        submitted_at: '2026-04-02T00:00:00Z',
        submitter_meta: null
      }
    ];
  },
  async detail() {
    return {
      id: 'subm_1',
      questionnaire_id: 'fixed-survey-v1',
      answers: { q1: 'Jim', q2: 'Hello' },
      submitted_at: '2026-04-02T00:00:00Z',
      submitter_meta: null
    };
  }
};

test('questionnaire endpoint returns fixed questionnaire', async () => {
  const app = express();
  app.use(express.json());
  app.use(createSurveyRouter(fakeService as any));
  app.use(errorHandler);
  const res = await request(app).get('/api/questionnaires/fixed');
  assert.equal(res.status, 200);
  assert.equal(res.body.code, 'OK');
  assert.equal(res.body.data.id, 'fixed-survey-v1');
});

test('create submission endpoint returns 201 and stable fields', async () => {
  const app = express();
  app.use(express.json());
  app.use(createSurveyRouter(fakeService as any));
  app.use(errorHandler);
  const res = await request(app).post('/api/submissions').send({ questionnaire_id: 'fixed-survey-v1', answers: { q1: 'Jim', q2: 'Hello' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.id, 'subm_1');
  assert.ok(res.body.data.submitted_at);
  assert.ok(res.body.data.answers);
});
