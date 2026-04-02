import test from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionService } from '../services/submissionService.js';
import { HttpError } from '../infra/errors.js';

const fakeRepo = {
  async insert(record: any) {
    return { ...record, submitted_at: '2026-04-02T00:00:00Z' };
  },
  async listDesc() {
    return [{ id: 'subm_1', questionnaire_id: 'fixed-survey-v1', answers: { q1: 'a', q2: 'b' }, submitted_at: '2026-01-01T00:00:00Z', submitter_meta: null }];
  },
  async findById(id: string) {
    if (id === 'subm_1') return { id: 'subm_1', questionnaire_id: 'fixed-survey-v1', answers: { q1: 'a', q2: 'b' }, submitted_at: '2026-01-01T00:00:00Z', submitter_meta: null };
    return null;
  }
};

test('create validates required answers', async () => {
  const service = new SubmissionService(fakeRepo as any);
  await assert.rejects(
    service.create({ questionnaire_id: 'fixed-survey-v1', answers: { q1: 'ok', q2: '' } }),
    (err: unknown) => err instanceof HttpError && err.code === 'INVALID_REQUEST'
  );
});

test('detail returns not found when missing', async () => {
  const service = new SubmissionService(fakeRepo as any);
  await assert.rejects(service.detail('missing'), (err: unknown) => err instanceof HttpError && err.code === 'SUBMISSION_NOT_FOUND');
});
