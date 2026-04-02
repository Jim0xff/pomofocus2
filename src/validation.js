import { AppError } from './errors.js';

const MAX_ANSWER_LENGTH = 5000;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function validateSubmission(answers, questions) {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'answers must be a non-empty array');
  }

  const questionMap = new Map(questions.map((question) => [question.question_id, question]));
  const answerMap = new Map();

  for (const answer of answers) {
    if (typeof answer !== 'object' || answer === null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'each answer must be an object');
    }

    const { question_id: questionId, answer_text: answerText } = answer;

    if (typeof questionId !== 'string' || questionId.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'question_id must be a non-empty string');
    }

    if (!questionMap.has(questionId)) {
      throw new AppError(400, 'VALIDATION_ERROR', `question_id ${questionId} is invalid`);
    }

    if (answerMap.has(questionId)) {
      throw new AppError(400, 'VALIDATION_ERROR', `question_id ${questionId} is duplicated`);
    }

    if (typeof answerText !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', `answer_text for ${questionId} must be a string`);
    }

    if (answerText.trim().length > MAX_ANSWER_LENGTH) {
      throw new AppError(400, 'VALIDATION_ERROR', `answer_text for ${questionId} exceeds ${MAX_ANSWER_LENGTH} characters`);
    }

    answerMap.set(questionId, {
      question_id: questionId,
      answer_text: answerText,
    });
  }

  for (const question of questions) {
    if (!question.required) {
      continue;
    }

    const requiredAnswer = answerMap.get(question.question_id);
    if (!requiredAnswer || requiredAnswer.answer_text.trim().length === 0) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `required question ${question.question_id} is missing`,
      );
    }
  }

  return answers.map((answer) => ({
    question_id: answer.question_id,
    answer_text: answer.answer_text,
  }));
}

export function validatePaging(searchParams) {
  const pageRaw = searchParams.get('page');
  const pageSizeRaw = searchParams.get('page_size');
  const page = pageRaw === null ? DEFAULT_PAGE : Number(pageRaw);
  const pageSize = pageSizeRaw === null ? DEFAULT_PAGE_SIZE : Number(pageSizeRaw);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'page must be an integer greater than or equal to 1');
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `page_size must be an integer between 1 and ${MAX_PAGE_SIZE}`,
    );
  }

  return {
    page,
    page_size: pageSize,
  };
}

export function validateResponseId(responseId) {
  if (typeof responseId !== 'string' || responseId.length === 0 || responseId.length > 36) {
    throw new AppError(400, 'VALIDATION_ERROR', 'response_id is invalid');
  }

  return responseId;
}
