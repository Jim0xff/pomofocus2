import { randomUUID } from 'node:crypto';
import {
  InvalidAnswersError,
  InvalidQuestionnaireIdError,
  InvalidRequestBodyError,
  SubmissionNotFoundError,
} from '../infra/HttpError.js';
import { getRepository } from '../infra/datasource.js';
import { SurveySubmission, type SurveyAnswerSnapshot } from '../models/survey_submission.js';
import { FIXED_QUESTIONNAIRE, getQuestionById } from './questionnaire_service.js';

type SubmitSurveySubmissionInput = {
  questionnaireId: string;
  answers: SurveyAnswerSnapshot[];
};

type PaginationInput = {
  page: number;
  pageSize: number;
};

type SurveySubmissionDto = {
  submissionId: string;
  questionnaireId: string;
  submittedAt: string;
  answers: SurveyAnswerSnapshot[];
};

type SurveySubmissionPageDto = {
  items: SurveySubmissionDto[];
  page: number;
  pageSize: number;
  total: number;
};

function toSubmissionDto(entity: SurveySubmission): SurveySubmissionDto {
  return {
    submissionId: entity.id,
    questionnaireId: entity.questionnaireId,
    submittedAt: entity.submittedAt.toISOString(),
    answers: entity.answers,
  };
}

function assertValidPagination({ page, pageSize }: PaginationInput) {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new InvalidRequestBodyError({
      field: 'page/pageSize',
      reason: 'page must be >= 1 and pageSize must be between 1 and 100',
    });
  }
}

function normalizeAnswers(input: unknown): SurveyAnswerSnapshot[] {
  if (!Array.isArray(input)) {
    throw new InvalidAnswersError({
      field: 'answers',
      reason: 'answers must be an array',
    });
  }

  return input.map((answer, index) => {
    if (!answer || typeof answer !== 'object') {
      throw new InvalidAnswersError({
        field: `answers[${index}]`,
        reason: 'answer must be an object',
      });
    }

    const { questionId, answerText } = answer as Record<string, unknown>;
    if (typeof questionId !== 'string' || typeof answerText !== 'string') {
      throw new InvalidAnswersError({
        field: `answers[${index}]`,
        reason: 'questionId and answerText must be strings',
      });
    }

    return {
      questionId,
      answerText: answerText.trim(),
    };
  });
}

function validateQuestionnaireId(questionnaireId: unknown): string {
  if (typeof questionnaireId !== 'string') {
    throw new InvalidRequestBodyError({
      field: 'questionnaireId',
      reason: 'questionnaireId is required',
    });
  }

  if (questionnaireId !== FIXED_QUESTIONNAIRE.questionnaireId) {
    throw new InvalidQuestionnaireIdError({
      field: 'questionnaireId',
      reason: `questionnaireId must equal ${FIXED_QUESTIONNAIRE.questionnaireId}`,
    });
  }

  return questionnaireId;
}

function validateAnswers(answers: SurveyAnswerSnapshot[]): SurveyAnswerSnapshot[] {
  const seenQuestionIds = new Set<string>();

  for (let index = 0; index < answers.length; index += 1) {
    const answer = answers[index];
    const question = getQuestionById(answer.questionId);
    if (!question) {
      throw new InvalidAnswersError({
        field: `answers[${index}].questionId`,
        reason: 'questionId is not part of the fixed questionnaire',
      });
    }

    if (seenQuestionIds.has(answer.questionId)) {
      throw new InvalidAnswersError({
        field: `answers[${index}].questionId`,
        reason: 'duplicate questionId is not allowed',
      });
    }

    if (question.required && !answer.answerText) {
      throw new InvalidAnswersError({
        field: `answers[${index}].answerText`,
        reason: 'required question cannot be empty',
      });
    }

    seenQuestionIds.add(answer.questionId);
  }

  for (const question of FIXED_QUESTIONNAIRE.questions) {
    if (question.required && !answers.find((answer) => answer.questionId === question.questionId)) {
      throw new InvalidAnswersError({
        field: 'answers',
        reason: `missing required answer for ${question.questionId}`,
      });
    }
  }

  return answers;
}

export async function submitSurveySubmission(input: SubmitSurveySubmissionInput): Promise<SurveySubmissionDto> {
  if (!input || typeof input !== 'object') {
    throw new InvalidRequestBodyError({
      field: 'input',
      reason: 'input is required',
    });
  }

  const questionnaireId = validateQuestionnaireId(input.questionnaireId);
  const answers = validateAnswers(normalizeAnswers(input.answers));
  const repository = getRepository(SurveySubmission);
  const submission = repository.create({
    id: `sub_${randomUUID().replace(/-/g, '')}`,
    questionnaireId,
    answers,
    submittedAt: new Date(),
  });

  const saved = await repository.save(submission);
  return toSubmissionDto(saved);
}

export async function listSurveySubmissions({ page, pageSize }: PaginationInput): Promise<SurveySubmissionPageDto> {
  assertValidPagination({ page, pageSize });
  const repository = getRepository(SurveySubmission);
  const [items, total] = await repository.findAndCount({
    order: {
      submittedAt: 'DESC',
      id: 'DESC',
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: items.map(toSubmissionDto),
    page,
    pageSize,
    total,
  };
}

export async function getSurveySubmissionById(submissionId: string): Promise<SurveySubmissionDto> {
  if (!submissionId || typeof submissionId !== 'string') {
    throw new InvalidRequestBodyError({
      field: 'submissionId',
      reason: 'submissionId is required',
    });
  }

  const repository = getRepository(SurveySubmission);
  const entity = await repository.findOne({ where: { id: submissionId } });
  if (!entity) {
    throw new SubmissionNotFoundError({
      field: 'submissionId',
      reason: 'no submission matched the provided id',
    });
  }

  return toSubmissionDto(entity);
}
