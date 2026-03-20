import { PomodoroSessionMode, TaskStatus } from '../../src/domain/entities';
import { MemoryRepositoryBundle } from '../../src/infra/repositories/memory';
import { createServiceContainer } from '../../src/services';

describe('session and service layer', () => {
  function createServices() {
    return createServiceContainer({
      now: () => new Date('2026-03-20T10:00:00.000Z'),
      repositories: new MemoryRepositoryBundle(),
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
});
