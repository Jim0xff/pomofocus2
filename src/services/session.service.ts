import {
  PomodoroSessionMode,
  TaskProgressEventType,
  TaskStatus,
} from '../domain/entities';
import type {
  ProgressEventRepositoryContract,
  SessionRepositoryContract,
  TaskRepositoryContract,
} from '../domain/repositories';
import type { IdempotencyService } from './idempotency.service';
import type { SettingsService } from './settings.service';
import { ServiceError } from './service-error';

export interface StartSessionInput {
  idempotencyKey: string;
  taskId?: string | null;
}

export interface SessionMutationInput {
  idempotencyKey: string;
  sessionId: string;
}

export class SessionService {
  public constructor(
    private readonly sessionRepository: SessionRepositoryContract,
    private readonly taskRepository: TaskRepositoryContract,
    private readonly progressEventRepository: ProgressEventRepositoryContract,
    private readonly settingsService: SettingsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async getSessionState(userId: string, taskId?: string | null) {
    const session = taskId
      ? await this.sessionRepository.findLatestByTask(userId, taskId)
      : await this.sessionRepository.findActiveByUser(userId);

    if (!session) {
      return null;
    }

    return {
      ...session,
      restorable: Boolean(session.running || session.remainingSeconds > 0),
    };
  }

  public async startSession(userId: string, input: StartSessionInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const taskId = input.taskId?.trim();
        if (!taskId) {
          throw new ServiceError('TASK_NOT_SELECTED', 'task not selected', {
            statusCode: 400,
          });
        }

        const task = await this.taskRepository.findByIdForUser(taskId, userId, {
          includeArchived: true,
        });

        if (!task) {
          throw new ServiceError('TASK_NOT_SELECTED', 'task not selected', {
            details: {
              taskId,
            },
            statusCode: 400,
          });
        }

        if (task.status === TaskStatus.ARCHIVED || task.deletedAt !== null) {
          throw new ServiceError(
            'TASK_ARCHIVED_CANNOT_START_SESSION',
            'task archived cannot start session',
            {
              details: {
                taskId,
              },
              statusCode: 400,
            },
          );
        }

        const activeSession = await this.sessionRepository.findActiveByUser(userId);
        if (activeSession && activeSession.taskId !== taskId) {
          activeSession.running = false;
          activeSession.pausedAt = this.now();
          activeSession.version += 1;
          await this.sessionRepository.save(activeSession);
        }

        const existing = await this.sessionRepository.findLatestByTask(userId, taskId);
        if (existing) {
          existing.running = true;
          existing.pausedAt = null;
          existing.startedAt = existing.startedAt ?? this.now();
          existing.version += 1;
          return this.sessionRepository.save(existing);
        }

        const settings = await this.settingsService.getSettings(userId);

        return this.sessionRepository.save(
          this.sessionRepository.create({
            endedAt: null,
            focusCyclesCompleted: 0,
            mode: PomodoroSessionMode.FOCUS,
            pausedAt: null,
            remainingSeconds: settings.focusMinutes * 60,
            running: true,
            startedAt: this.now(),
            taskId,
            userId,
            version: 1,
          }),
        );
      },
      input,
      key: input.idempotencyKey,
      operation: 'startSession',
    });
  }

  public async pauseSession(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const session = await this.getSessionOrThrow(userId, input.sessionId);
        if (!session.running) {
          throw new ServiceError('INVALID_SESSION_STATE', 'session is not running', {
            details: {
              sessionId: input.sessionId,
            },
            statusCode: 400,
          });
        }

        session.running = false;
        session.pausedAt = this.now();
        session.version += 1;

        return this.sessionRepository.save(session);
      },
      input,
      key: input.idempotencyKey,
      operation: 'pauseSession',
    });
  }

  public async resetSession(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const [settings, session] = await Promise.all([
          this.settingsService.getSettings(userId),
          this.getSessionOrThrow(userId, input.sessionId),
        ]);

        session.remainingSeconds = this.getDurationForMode(session.mode, settings);
        session.running = false;
        session.pausedAt = this.now();
        session.version += 1;

        const savedSession = await this.sessionRepository.save(session);
        await this.progressEventRepository.save(
          this.progressEventRepository.create({
            deltaActualPomodoros: 0,
            eventType: TaskProgressEventType.SESSION_RESET,
            payload: {
              mode: savedSession.mode,
            },
            sessionId: savedSession.id,
            taskId: savedSession.taskId,
            userId,
          }),
        );

        return savedSession;
      },
      input,
      key: input.idempotencyKey,
      operation: 'resetSession',
    });
  }

  public async skipBreak(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const [settings, session] = await Promise.all([
          this.settingsService.getSettings(userId),
          this.getSessionOrThrow(userId, input.sessionId),
        ]);

        if (
          session.mode !== PomodoroSessionMode.BREAK &&
          session.mode !== PomodoroSessionMode.LONG_BREAK
        ) {
          throw new ServiceError('INVALID_SESSION_STATE', 'session is not on a break', {
            details: {
              mode: session.mode,
              sessionId: input.sessionId,
            },
            statusCode: 400,
          });
        }

        session.mode = PomodoroSessionMode.FOCUS;
        session.remainingSeconds = settings.focusMinutes * 60;
        session.running = true;
        session.pausedAt = null;
        session.version += 1;

        return this.sessionRepository.save(session);
      },
      input,
      key: input.idempotencyKey,
      operation: 'skipBreak',
    });
  }

  public async completeFocusCycle(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const [settings, session] = await Promise.all([
          this.settingsService.getSettings(userId),
          this.getSessionOrThrow(userId, input.sessionId),
        ]);

        if (session.mode !== PomodoroSessionMode.FOCUS) {
          throw new ServiceError('INVALID_SESSION_STATE', 'session is not in focus mode', {
            details: {
              mode: session.mode,
              sessionId: input.sessionId,
            },
            statusCode: 400,
          });
        }

        const task = await this.taskRepository.findByIdForUser(session.taskId, userId, {
          includeArchived: true,
        });
        if (!task) {
          throw new ServiceError('TASK_NOT_FOUND', 'task not found', {
            details: {
              taskId: session.taskId,
            },
            statusCode: 404,
          });
        }

        task.actualPomodoros += 1;
        if (task.actualPomodoros >= task.estimatedPomodoros && task.status === TaskStatus.ACTIVE) {
          task.status = TaskStatus.COMPLETED;
          task.completedAt = this.now();
        }

        session.focusCyclesCompleted += 1;
        session.mode =
          session.focusCyclesCompleted % settings.longBreakInterval === 0
            ? PomodoroSessionMode.LONG_BREAK
            : PomodoroSessionMode.BREAK;
        session.remainingSeconds = this.getDurationForMode(session.mode, settings);
        session.running = true;
        session.pausedAt = null;
        session.version += 1;

        const [savedTask, savedSession] = await Promise.all([
          this.taskRepository.save(task),
          this.sessionRepository.save(session),
        ]);

        await this.progressEventRepository.save(
          this.progressEventRepository.create({
            deltaActualPomodoros: 1,
            eventType: TaskProgressEventType.FOCUS_COMPLETED,
            payload: {
              nextMode: savedSession.mode,
            },
            sessionId: savedSession.id,
            taskId: savedTask.id,
            userId,
          }),
        );

        return {
          session: savedSession,
          task: savedTask,
        };
      },
      input,
      key: input.idempotencyKey,
      operation: 'completeFocusCycle',
    });
  }

  private async getSessionOrThrow(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findByIdForUser(sessionId, userId);
    if (!session) {
      throw new ServiceError('SESSION_NOT_FOUND', 'session not found', {
        details: {
          sessionId,
        },
        statusCode: 404,
      });
    }

    return session;
  }

  private getDurationForMode(
    mode: PomodoroSessionMode,
    settings: Awaited<ReturnType<SettingsService['getSettings']>>,
  ): number {
    if (mode === PomodoroSessionMode.FOCUS) {
      return settings.focusMinutes * 60;
    }

    if (mode === PomodoroSessionMode.LONG_BREAK) {
      return settings.longBreakMinutes * 60;
    }

    return settings.shortBreakMinutes * 60;
  }
}
