import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDataSource, AppDataSource } from '../src/infra/datasource.js';
import { seedSurveyQuestions } from '../src/seed/surveySeed.js';
import { SurveyRepository } from '../src/repositories/surveyRepository.js';
import { SurveyService } from '../src/services/surveyService.js';

test('getSurvey returns fixed questions in expected contract format', async () => {
  await initializeDataSource();
  await seedSurveyQuestions(AppDataSource);

  const service = new SurveyService(new SurveyRepository(AppDataSource));
  const result = await service.getSurvey();

  assert.ok(result.survey.questions.length >= 2);
  assert.equal(result.survey.questions[0]?.question_id, 'q_name');
});

test('submitSurvey persists and returns submission contract', async () => {
  const service = new SurveyService(new SurveyRepository(AppDataSource));

  const result = await service.submitSurvey({
    answers: [
      { question_id: 'q_name', answer_text: 'Jim' },
      { question_id: 'q_feedback', answer_text: 'hello' }
    ]
  });

  assert.ok(result.submission_id.startsWith('sub_'));
  assert.match(result.submitted_at, /T/);
});

test('submitSurvey rejects missing required answer', async () => {
  const service = new SurveyService(new SurveyRepository(AppDataSource));

  await assert.rejects(
    service.submitSurvey({
      answers: [{ question_id: 'q_feedback', answer_text: 'only optional' }]
    }),
    /required question q_name is missing/
  );
});
