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

test('admin list returns submissions sorted by submitted_at desc', async () => {
  const service = new SurveyService(new SurveyRepository(AppDataSource));

  await service.submitSurvey({
    answers: [
      { question_id: 'q_name', answer_text: 'User A' },
      { question_id: 'q_feedback', answer_text: 'A' }
    ]
  });

  await service.submitSurvey({
    answers: [
      { question_id: 'q_name', answer_text: 'User B' },
      { question_id: 'q_feedback', answer_text: 'B' }
    ]
  });

  const result = await service.listAdminSubmissions();
  assert.ok(result.items.length >= 2);
  const t0 = new Date(result.items[0]!.submitted_at).getTime();
  const t1 = new Date(result.items[1]!.submitted_at).getTime();
  assert.ok(t0 >= t1);
});

test('admin detail returns full answers and not-found is rejected', async () => {
  const service = new SurveyService(new SurveyRepository(AppDataSource));
  const submitted = await service.submitSurvey({
    answers: [
      { question_id: 'q_name', answer_text: 'Detail User' },
      { question_id: 'q_feedback', answer_text: 'detail' }
    ]
  });

  const detail = await service.getAdminSubmissionDetail(submitted.submission_id);
  assert.equal(detail.submission_id, submitted.submission_id);
  assert.ok(detail.answers.length >= 1);

  await assert.rejects(service.getAdminSubmissionDetail('missing_submission_id'), /submission not found/);
});
