import { IdempotencyKeyStatus } from '../../src/domain/entities';
import { MemoryRepositoryBundle } from '../../src/infra/repositories/memory';
import { DefaultIdempotencyService } from '../../src/services/idempotency.service';

describe('idempotency service critical paths', () => {
  function createService(repositories = new MemoryRepositoryBundle()) {
    return new DefaultIdempotencyService({
      now: () => new Date('2026-03-20T12:00:00.000Z'),
      repositories,
      strictMode: true,
    });
  }

  it('replays strict-mode responses and rejects request hash mismatches', async () => {
    const service = createService();

    const firstResult = await service.run({
      execute: () =>
        Promise.resolve({
          createdAt: new Date('2026-03-20T12:34:56.000Z'),
          taskId: 'task-1',
        }),
      input: {
        estimatedPomodoros: 2,
        title: 'Replay me',
      },
      key: 'idem-strict-replay',
      operation: 'createTask',
    });
    const replayedResult = await service.run({
      execute: () =>
        Promise.resolve({
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          taskId: 'task-2',
        }),
      input: {
        estimatedPomodoros: 2,
        title: 'Replay me',
      },
      key: 'idem-strict-replay',
      operation: 'createTask',
    });

    expect(replayedResult).toEqual(firstResult);
    expect(replayedResult.createdAt).toBeInstanceOf(Date);

    await expect(
      service.run({
        execute: () =>
          Promise.resolve({
            taskId: 'task-3',
          }),
        input: {
          estimatedPomodoros: 3,
          title: 'Different payload',
        },
        key: 'idem-strict-replay',
        operation: 'createTask',
      }),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      details: {
        conflictType: 'REQUEST_HASH_MISMATCH',
      },
    });
  });

  it('returns IN_PROGRESS while a strict-mode request with the same key is still pending', async () => {
    const service = createService();
    let releaseOperation: ((value: { ok: boolean }) => void) | undefined;

    const firstRequest = service.run({
      execute: async () =>
        new Promise<{ ok: boolean }>((resolve) => {
          releaseOperation = resolve;
        }),
      input: {
        taskId: 'task-1',
      },
      key: 'idem-strict-pending',
      operation: 'startSession',
    });

    await expect(
      service.run({
        execute: () =>
          Promise.resolve({
            ok: true,
          }),
        input: {
          taskId: 'task-1',
        },
        key: 'idem-strict-pending',
        operation: 'startSession',
      }),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      details: {
        conflictType: 'IN_PROGRESS',
      },
    });

    releaseOperation?.({
      ok: true,
    });
    await expect(firstRequest).resolves.toEqual({
      ok: true,
    });
  });

  it('removes failed strict-mode reservations so the key can be retried', async () => {
    const repositories = new MemoryRepositoryBundle();
    const service = createService(repositories);

    await expect(
      service.run({
        execute: async () => {
          throw new Error('boom');
        },
        input: {
          taskId: 'task-1',
        },
        key: 'idem-strict-retry',
        operation: 'completeTask',
      }),
    ).rejects.toThrow('boom');

    expect(
      await repositories.idempotencyKeys.findByOperationAndKey('completeTask', 'idem-strict-retry'),
    ).toBeNull();

    await expect(
      service.run({
        execute: () =>
          Promise.resolve({
            status: IdempotencyKeyStatus.SUCCEEDED,
          }),
        input: {
          taskId: 'task-2',
        },
        key: 'idem-strict-retry',
        operation: 'completeTask',
      }),
    ).resolves.toEqual({
      status: IdempotencyKeyStatus.SUCCEEDED,
    });
  });
});
