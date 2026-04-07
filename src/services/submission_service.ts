import { randomUUID } from 'node:crypto';
import { appDataSource } from '../infra/datasource.js';
import { SurveySubmissionAnswerEntity, SurveySubmissionEntity } from '../models/entities.js';
import { getFixedQuestionnaire } from './questionnaire_service.js';

export async function createSubmission(input: { questionnaireId: string; answers: Array<{ question_id: string; answer_value: string }>; }) {
  const questionnaire = await getFixedQuestionnaire();
  if (input.questionnaireId !== questionnaire.questionnaireId) throw Object.assign(new Error('invalid questionnaire id'), { code: 'INVALID_QUESTIONNAIRE', status: 400 });
  if (!Array.isArray(input.answers) || input.answers.length === 0) throw Object.assign(new Error('answers is required'), { code: 'INVALID_REQUEST', status: 400 });

  const questionSet = new Map(questionnaire.questions.map((q) => [q.questionId, q]));
  for (const answer of input.answers) {
    const q = questionSet.get(answer.question_id);
    if (!q) throw Object.assign(new Error('invalid question id'), { code: 'INVALID_ANSWER', status: 400, details: { question_id: answer.question_id } });
    if (q.required && !answer.answer_value?.trim()) throw Object.assign(new Error('required answer is empty'), { code: 'INVALID_ANSWER', status: 400, details: { question_id: answer.question_id } });
  }

  const submissionId = `sub_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const submittedAt = new Date();

  await appDataSource.transaction(async (manager) => {
    await manager.getRepository(SurveySubmissionEntity).save({ submissionId, questionnaireId: input.questionnaireId, submittedAt } as any);
    await manager.getRepository(SurveySubmissionAnswerEntity).save(
      input.answers.map((a) => ({ submissionId, questionId: a.question_id, answerValue: a.answer_value })) as any
    );
  });

  return {
    submissionId,
    submittedAt: submittedAt.toISOString(),
    answers: input.answers.map((a) => ({ questionId: a.question_id, answerValue: a.answer_value }))
  };
}

export async function listSubmissions(page = 1, pageSize = 20) {
  const repo = appDataSource.getRepository(SurveySubmissionEntity);
  const [rows, total] = await repo.findAndCount({ order: { submittedAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize } as any);
  return {
    items: rows.map((s: any) => ({ submission_id: s.submissionId, submitted_at: new Date(s.submittedAt).toISOString() })),
    total,
    page,
    page_size: pageSize
  };
}

export async function getSubmissionDetail(submissionId: string) {
  const submissionRepo = appDataSource.getRepository(SurveySubmissionEntity);
  const answerRepo = appDataSource.getRepository(SurveySubmissionAnswerEntity);
  const submission = await submissionRepo.findOneBy({ submissionId } as any);
  if (!submission) throw Object.assign(new Error('submission not found'), { code: 'SUBMISSION_NOT_FOUND', status: 404, details: { submission_id: submissionId } });
  const answers = await answerRepo.findBy({ submissionId } as any);
  return {
    submission_id: (submission as any).submissionId,
    submitted_at: new Date((submission as any).submittedAt).toISOString(),
    answers: answers.map((a: any) => ({ question_id: a.questionId, answer_value: a.answerValue }))
  };
}
