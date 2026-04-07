import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../infra/datasource.js';
import { AppError } from '../infra/errors.js';
import { Questionnaire } from '../models/Questionnaire.js';
import { QuestionnaireQuestion } from '../models/QuestionnaireQuestion.js';
import { SurveyResponse } from '../models/SurveyResponse.js';
import { SurveyResponseAnswer } from '../models/SurveyResponseAnswer.js';

export async function getQuestionnaire() {
  const qRepo = AppDataSource.getRepository(Questionnaire);
  const qqRepo = AppDataSource.getRepository(QuestionnaireQuestion);
  const q = await qRepo.findOneBy({ questionnaireId: 'fixed-survey-v1' });
  if (!q) throw new AppError('INTERNAL_ERROR', 500, 'fixed questionnaire missing');
  const questions = await qqRepo.find({ where: { questionnaireRefId: q.id }, order: { displayOrder: 'ASC' } });
  return {
    questionnaire_id: q.questionnaireId,
    questions: questions.map((it) => ({
      question_id: it.questionId,
      question_text: it.questionText,
      question_type: it.questionType,
      required: it.required
    }))
  };
}

let writeQueue: Promise<void> = Promise.resolve();

export async function submitResponse(questionnaireId: string, answers: Array<{question_id: string; answer: string;}>) {
  if (questionnaireId !== 'fixed-survey-v1') throw new AppError('INVALID_QUESTIONNAIRE', 400, 'invalid questionnaire');
  if (!Array.isArray(answers) || answers.length === 0) throw new AppError('INVALID_REQUEST', 400, 'answers is required');
  const survey = await getQuestionnaire();
  const required = new Map(survey.questions.map((q: any) => [q.question_id, q.required]));

  for (const item of answers) {
    if (!item.question_id || typeof item.answer !== 'string') throw new AppError('INVALID_REQUEST', 400, 'invalid answer payload');
    if (!required.has(item.question_id)) throw new AppError('INVALID_ANSWER', 400, 'question not found', { question_id: item.question_id });
    if (required.get(item.question_id) && !item.answer.trim()) {
      throw new AppError('INVALID_ANSWER', 400, 'required answer is empty', { question_id: item.question_id });
    }
  }

  const responseId = `rsp_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
  const submittedAt = new Date();

  const run = async () => {
    await AppDataSource.transaction(async (manager) => {
      await manager.getRepository(SurveyResponse).save({ responseId, questionnaireId, submittedAt });
      await manager.getRepository(SurveyResponseAnswer).save(
        answers.map((a) => ({ responseId, questionId: a.question_id, answer: a.answer }))
      );
    });
  };

  writeQueue = writeQueue.then(run, run);
  await writeQueue;

  return { response_id: responseId, submitted_at: submittedAt.toISOString(), answers };
}

export async function listResponses(page = 1, pageSize = 20) {
  if (pageSize > 100) throw new AppError('INVALID_REQUEST', 400, 'page_size must be <= 100', { field: 'page_size' });
  const repo = AppDataSource.getRepository(SurveyResponse);
  const [rows, total] = await repo.findAndCount({
    order: { submittedAt: 'DESC', id: 'DESC' },
    skip: (page - 1) * pageSize,
    take: pageSize
  });
  return {
    items: rows.map((r) => ({ response_id: r.responseId, submitted_at: r.submittedAt.toISOString() })),
    pagination: { page, page_size: pageSize, total }
  };
}

export async function getResponseDetail(responseId: string) {
  const rRepo = AppDataSource.getRepository(SurveyResponse);
  const aRepo = AppDataSource.getRepository(SurveyResponseAnswer);
  const row = await rRepo.findOneBy({ responseId });
  if (!row) throw new AppError('RESPONSE_NOT_FOUND', 404, 'response not found', { response_id: responseId });
  const answers = await aRepo.find({ where: { responseId }, order: { id: 'ASC' } });
  return {
    response_id: row.responseId,
    submitted_at: row.submittedAt.toISOString(),
    answers: answers.map((a) => ({ question_id: a.questionId, answer: a.answer }))
  };
}

export async function explainListQueryPlan() {
  const rows = await AppDataSource.query('EXPLAIN QUERY PLAN SELECT responseId, submittedAt FROM surveyResponse ORDER BY submittedAt DESC LIMIT 20');
  return rows;
}
