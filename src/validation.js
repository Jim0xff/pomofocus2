import { AppError } from './errors.js';

const MAX_ANSWER_LENGTH = 5000;

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
