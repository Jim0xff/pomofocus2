import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitSignup, listSignups } from '../src/services/signup-service.js';
import { HttpError } from '../src/infra/errors.js';
import { AppDataSource } from '../src/db.js';

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('signup-service success paths', () => {
  it('submits signup and returns signupId + submittedAt', async () => {
    const repoMock = {
      create: vi.fn((input) => input),
      save: vi.fn(async (input) => ({ id: '1', ...input })),
    };
    vi.spyOn(AppDataSource, 'getRepository').mockReturnValue(repoMock as any);

    const result = await submitSignup({ name: 'Alice', email: 'alice@example.com', teamSize: 3 });

    expect(result.signupId).toBe('1');
    expect(typeof result.submittedAt).toBe('string');
  });

  it('lists signups using submittedAt DESC order', async () => {
    const repoMock = {
      findAndCount: vi.fn(async () => [
        [
          {
            id: '2',
            name: 'Bob',
            email: 'bob@example.com',
            teamSize: 1,
            submittedAt: new Date('2026-04-01T09:00:00.000Z'),
          },
        ],
        1,
      ]),
    };
    vi.spyOn(AppDataSource, 'getRepository').mockReturnValue(repoMock as any);

    const result = await listSignups({ page: '1', size: '20' });

    expect(repoMock.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { submittedAt: 'DESC' } }),
    );
    expect(result.items[0].id).toBe('2');
    expect(result.total).toBe(1);
  });
});
