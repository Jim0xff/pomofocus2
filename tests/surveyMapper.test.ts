import test from 'node:test';
import assert from 'node:assert/strict';
import { toSubmissionListItemDto } from '../src/mappers/surveyMapper.js';

test('toSubmissionListItemDto maps camelCase to snake_case', () => {
  const dto = toSubmissionListItemDto({
    id: 1,
    submissionId: 'sub_1',
    status: 'submitted',
    submittedAt: new Date('2026-04-09T00:00:00Z'),
    createdAt: new Date('2026-04-09T00:00:00Z'),
    updatedAt: new Date('2026-04-09T00:00:00Z')
  } as any);

  assert.equal(dto.submission_id, 'sub_1');
  assert.equal(dto.submitted_at, '2026-04-09T00:00:00.000Z');
});
