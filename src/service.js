import { randomUUID } from 'node:crypto';

import { getFixedSurvey } from './survey.js';
import { validateSubmission } from './validation.js';

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

  return {
    getSurvey,
    submitResponse,
  };
}
