import { randomUUID } from 'node:crypto';

import { AppError } from './errors.js';
import { getFixedSurvey } from './survey.js';
import { validateResponseId, validateSubmission } from './validation.js';

export function createSurveyService(repository) {
  function getSurvey() {
    return {
      questions: getFixedSurvey(),
    };
  }

  function submitResponse(payload) {
    const survey = getFixedSurvey();
    const answers = validateSubmission(payload?.answers, survey);
    const responseId = randomUUID();
    const submittedAt = new Date().toISOString();

    repository.saveResponse({
      response_id: responseId,
      submitted_at: submittedAt,
      answers,
    });

    return {
      response_id: responseId,
      submitted_at: submittedAt,
      message: '提交成功',
    };
  }

  function listResponses(query) {
    return repository.listResponses(query);
  }

  function getResponseDetail(responseId) {
    const validResponseId = validateResponseId(responseId);
    const detail = repository.getResponseDetail(validResponseId);

    if (!detail) {
      throw new AppError(404, 'NOT_FOUND', `response ${validResponseId} was not found`);
    }

    const answerMap = new Map(
      detail.answers.map((answer) => [answer.question_id, answer.answer_text]),
    );

    return {
      response_id: detail.response_id,
      submitted_at: detail.submitted_at,
      answers: getFixedSurvey().map((question) => ({
        ...question,
        answer_text: answerMap.get(question.question_id) ?? '',
      })),
    };
  }

  return {
    getSurvey,
    submitResponse,
    listResponses,
    getResponseDetail,
  };
}
