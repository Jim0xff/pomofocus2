import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase } from '../infra/datasource.js';
import { getQuestionnaire, submitResponse, listResponses, getResponseDetail } from '../services/surveyService.js';

await initializeDatabase();

test('questionnaire + submit/list/detail flow', async () => {
  const q = await getQuestionnaire();
  assert.equal(q.questionnaire_id, 'fixed-survey-v1');

  const submitted = await submitResponse('fixed-survey-v1', [{ question_id: 'q_name', answer: 'Jim' }]);
  assert.ok(submitted.response_id.startsWith('rsp_'));

  const list = await listResponses(1, 20);
  assert.ok(list.items.length >= 1);

  const detail = await getResponseDetail(submitted.response_id);
  assert.equal(detail.response_id, submitted.response_id);
  assert.equal(detail.answers[0].question_id, 'q_name');
});
