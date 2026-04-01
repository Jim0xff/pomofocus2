import { describe, it, expect } from 'vitest';
import { submitSignup, listSignups } from '../src/services/signup-service.js';
import { HttpError } from '../src/infra/errors.js';

describe('signup-service validation', () => {
  it('throws VALIDATION_ERROR when signup payload is invalid', async () => {
    await expect(submitSignup({ name: '', email: 'bad', teamSize: 0 })).rejects.toMatchObject<HttpError>({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws BAD_REQUEST when list query is invalid', async () => {
    await expect(listSignups({ page: '0', size: '999' })).rejects.toMatchObject<HttpError>({
      status: 400,
      code: 'BAD_REQUEST',
    });
  });
});
