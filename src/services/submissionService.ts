import { v4 as uuidv4 } from 'uuid';
import { FIXED_QUESTIONNAIRE } from '../config/questionnaire.js';
import { HttpError } from '../infra/errors.js';
import { SubmissionRepository, type SubmissionRecord } from '../repositories/submissionRepository.js';

export interface CreateSubmissionInput {
  questionnaire_id?: string;
  answers?: Record<string, unknown>;
  submitter_meta?: Record<string, unknown> | null;
}

export class SubmissionService {
  constructor(private readonly repository: SubmissionRepository) {}

  validatePayload(payload: CreateSubmissionInput): asserts payload is Required<Pick<CreateSubmissionInput, 'questionnaire_id' | 'answers'>> & CreateSubmissionInput {
    if (!payload.questionnaire_id) {
      throw new HttpError('INVALID_REQUEST', 400, 'questionnaire_id is required', { field: 'questionnaire_id' });
    }

    if (payload.questionnaire_id !== FIXED_QUESTIONNAIRE.id) {
      throw new HttpError('QUESTIONNAIRE_NOT_FOUND', 404, 'questionnaire not found');
    }

    if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
      throw new HttpError('INVALID_REQUEST', 400, 'answers must be an object', { field: 'answers' });
    }

    for (const q of FIXED_QUESTIONNAIRE.questions) {
      if (q.required) {
        const value = payload.answers[q.id];
        if (typeof value !== 'string' || value.trim() === '') {
          throw new HttpError('INVALID_REQUEST', 400, 'required answer missing', { field: `answers.${q.id}` });
        }
      }
    }
  }

  async create(payload: CreateSubmissionInput): Promise<SubmissionRecord> {
    this.validatePayload(payload);

    const record = await this.repository.insert({
      id: `subm_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      questionnaire_id: payload.questionnaire_id,
      answers: payload.answers as Record<string, string>,
      submitter_meta: payload.submitter_meta ?? null
    });

    return record;
  }

  async list(): Promise<SubmissionRecord[]> {
    return this.repository.listDesc();
  }

  async detail(id: string): Promise<SubmissionRecord> {
    if (!id || typeof id !== 'string') {
      throw new HttpError('INVALID_REQUEST', 400, 'id is required', { field: 'id' });
    }

    const result = await this.repository.findById(id);
    if (!result) {
      throw new HttpError('SUBMISSION_NOT_FOUND', 404, 'submission not found');
    }
    return result;
  }
}
