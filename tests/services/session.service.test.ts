import { PomodoroSessionMode, TaskStatus } from '../../src/domain/entities';
import type {
  RepositoryBundle,
  SessionRepositoryContract,
} from '../../src/domain/repositories';
import { MemoryRepositoryBundle } from '../../src/infra/repositories/memory';
import { createServiceContainer } from '../../src/services';

describe('session and service layer', () => {
  function createServices(repositories: RepositoryBundle = new MemoryRepositoryBundle()) {
    return createServiceContainer({
      now: () => new Date('2026-03-20T10:00:00.000Z'),
      repositories,
    });
  }

  it('completes a focus cycle and updates the task plus stats', async () => {
    const services = createServices();
    const task = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 3,
      idempotencyKey: 'idem-task-1',
      title: 'Backend work',
    });
    const session = await services.sessions.startSession('user-1', {
      idempotencyKey: 'idem-start-1',
      taskId: task.id,
    });

    const result = await services.sessions.completeFocusCycle('user-1', {
      idempotencyKey: 'idem-cycle-1',
      sessionId: session.id,
    });
    const stats = await services.stats.todayStats('user-1');

    expect(result.session.mode).toBe(PomodoroSessionMode.BREAK);
    expect(result.session.focusCyclesCompleted).toBe(1);
    expect(result.session.running).toBe(true);
    expect(result.task.actualPomodoros).toBe(1);
    expect(result.task.status).toBe(TaskStatus.ACTIVE);
    expect(stats.completedPomodoros).toBe(1);
    expect(stats.completedTasks).toBe(0);
    expect(stats.totalTasks).toBe(1);
  });

  it('rejects skipBreak when the session is not in a break state', async () => {
    const services = createServices();
    const task = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 1,
      idempotencyKey: 'idem-task-2',
      title: 'Focus only',
    });
    const session = await services.sessions.startSession('user-1', {
      idempotencyKey: 'idem-start-2',
      taskId: task.id,
    });

    await expect(
      services.sessions.skipBreak('user-1', {
        idempotencyKey: 'idem-skip-1',
        sessionId: session.id,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SESSION_STATE',
      message: 'session is not on a break',
    });
  });

  it('completes tasks explicitly and stores completedAt', async () => {
    const services = createServices();
    const task = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 2,
      idempotencyKey: 'idem-task-3',
      title: 'Finish docs',
    });

    const completedTask = await services.tasks.completeTask('user-1', {
      idempotencyKey: 'idem-complete-1',
      taskId: task.id,
    });

    expect(completedTask.status).toBe(TaskStatus.COMPLETED);
    expect(completedTask.completedAt?.toISOString()).toBe('2026-03-20T10:00:00.000Z');
  });

  it('validates settings updates', async () => {
    const services = createServices();

    await expect(
      services.settings.updateSettings('user-1', {
        alarmVolume: 200,
        idempotencyKey: 'idem-settings-bad',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SETTINGS',
      message: 'alarmVolume must be between 0 and 100.',
    });
  });

  it('replays duplicate idempotent requests and rejects request hash mismatches', async () => {
    const services = createServices();

    const firstTask = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 2,
      idempotencyKey: 'idem-create-duplicate',
      title: 'Replay me',
    });
    const replayedTask = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 2,
      idempotencyKey: 'idem-create-duplicate',
      title: 'Replay me',
    });
    const tasks = await services.tasks.listTasks('user-1', {});

    expect(replayedTask.id).toBe(firstTask.id);
    expect(replayedTask.createdAt).toBeInstanceOf(Date);
    expect(tasks).toHaveLength(1);

    await expect(
      services.tasks.createTask('user-1', {
        estimatedPomodoros: 3,
        idempotencyKey: 'idem-create-duplicate',
        title: 'Different payload',
      }),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      details: {
        conflictType: 'REQUEST_HASH_MISMATCH',
      },
    });
  });

  it('raises a concurrent update conflict when a session version is stale', async () => {
    const baseRepositories = new MemoryRepositoryBundle();
    let failNextVersionedSave = true;

    const sessions: SessionRepositoryContract = {
      create: (session) => baseRepositories.sessions.create(session),
      findActiveByUser: (userId) => baseRepositories.sessions.findActiveByUser(userId),
      findByIdForUser: (sessionId, userId) =>
        baseRepositories.sessions.findByIdForUser(sessionId, userId),
      findLatestByTask: (userId, taskId) => baseRepositories.sessions.findLatestByTask(userId, taskId),
      save: (session) => baseRepositories.sessions.save(session),
      saveWithVersion: async (session, expectedVersion) => {
        if (failNextVersionedSave) {
          failNextVersionedSave = false;
          return null;
        }

        return baseRepositories.sessions.saveWithVersion(session, expectedVersion);
      },
    };

    const repositories: RepositoryBundle = {
      idempotencyKeys: baseRepositories.idempotencyKeys,
      progressEvents: baseRepositories.progressEvents,
      sessions,
      settings: baseRepositories.settings,
      tasks: baseRepositories.tasks,
      withTransaction: async (handler) => handler(repositories),
    };
    const services = createServices(repositories);

    const task = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 1,
      idempotencyKey: 'idem-task-concurrency',
      title: 'Concurrency',
    });
    const session = await services.sessions.startSession('user-1', {
      idempotencyKey: 'idem-start-concurrency',
      taskId: task.id,
    });

    await expect(
      services.sessions.pauseSession('user-1', {
        idempotencyKey: 'idem-pause-concurrency',
        sessionId: session.id,
      }),
    ).rejects.toMatchObject({
      code: 'CONCURRENT_UPDATE_CONFLICT',
      details: {
        expectedVersion: 1,
        sessionId: session.id,
      },
    });
  });

  it('rolls back task and session changes when completing a focus cycle fails mid-transaction', async () => {
    const baseRepositories = new MemoryRepositoryBundle();
    const repositories: RepositoryBundle = {
      idempotencyKeys: baseRepositories.idempotencyKeys,
      progressEvents: {
        create: (event) => baseRepositories.progressEvents.create(event),
        save: () => Promise.reject(new Error('progress event write failed')),
      },
      sessions: baseRepositories.sessions,
      settings: baseRepositories.settings,
      tasks: baseRepositories.tasks,
      withTransaction: async (handler) => baseRepositories.withTransaction(() => handler(repositories)),
    };
    const services = createServices(repositories);

    const task = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 1,
      idempotencyKey: 'idem-task-rollback',
      title: 'Rollback critical path',
    });
    const session = await services.sessions.startSession('user-1', {
      idempotencyKey: 'idem-start-rollback',
      taskId: task.id,
    });

    await expect(
      services.sessions.completeFocusCycle('user-1', {
        idempotencyKey: 'idem-cycle-rollback',
        sessionId: session.id,
      }),
    ).rejects.toThrow('progress event write failed');

    const persistedTask = await baseRepositories.tasks.findByIdForUser(task.id, 'user-1', {
      includeArchived: true,
    });
    const persistedSession = await baseRepositories.sessions.findByIdForUser(session.id, 'user-1');

    expect(persistedTask).toMatchObject({
      actualPomodoros: 0,
      completedAt: null,
      status: TaskStatus.ACTIVE,
    });
    expect(persistedSession).toMatchObject({
      focusCyclesCompleted: 0,
      mode: PomodoroSessionMode.FOCUS,
      remainingSeconds: 25 * 60,
      running: true,
      version: 1,
    });
  });
});
