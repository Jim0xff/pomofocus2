import {
  PomodoroSessionMode,
  TaskProgressEventType,
  TaskStatus,
} from '../domain/entities';
import type {
  ProgressEventRepositoryContract,
  RepositoryBundle,
  SessionRepositoryContract,
  SettingsRepositoryContract,
  TaskRepositoryContract,
} from '../domain/repositories';
import type { IdempotencyService } from './idempotency.service';
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
    private readonly repositories: Pick<
      RepositoryBundle,
      'progressEvents' | 'sessions' | 'settings' | 'tasks' | 'withTransaction'
    >,
    private readonly idempotencyService: IdempotencyService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async getSessionState(userId: string, taskId?: string | null) {
    const session = taskId
      ? await this.repositories.sessions.findLatestByTask(userId, taskId)
      : await this.repositories.sessions.findActiveByUser(userId);

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
        return this.repositories.withTransaction(async (repositories) => {
          const taskId = input.taskId?.trim();
          if (!taskId) {
            throw new ServiceError('TASK_NOT_SELECTED', 'task not selected', {
              statusCode: 400,
            });
          }

          const task = await repositories.tasks.findByIdForUser(taskId, userId, {
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

          const activeSession = await repositories.sessions.findActiveByUser(userId);
          if (activeSession && activeSession.taskId !== taskId) {
            const expectedVersion = activeSession.version;
            const pausedSession = await this.saveSessionWithVersion(
              repositories.sessions,
              Object.assign(activeSession, {
                pausedAt: this.now(),
                running: false,
                version: expectedVersion + 1,
              }),
              expectedVersion,
            );
            void pausedSession;
          }

          const existing = await repositories.sessions.findLatestByTask(userId, taskId);
          if (existing) {
            const expectedVersion = existing.version;
            return this.saveSessionWithVersion(
              repositories.sessions,
              Object.assign(existing, {
                pausedAt: null,
                running: true,
                startedAt: existing.startedAt ?? this.now(),
                version: expectedVersion + 1,
              }),
              expectedVersion,
            );
          }

          const settings = await this.getOrCreateSettings(repositories.settings, userId);

          return repositories.sessions.save(
            repositories.sessions.create({
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
        });
      },
      input,
      key: input.idempotencyKey,
      operation: 'startSession',
    });
  }

  public async pauseSession(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        return this.repositories.withTransaction(async (repositories) => {
          const session = await this.getSessionOrThrow(repositories.sessions, userId, input.sessionId);
          if (!session.running) {
            throw new ServiceError('INVALID_SESSION_STATE', 'session is not running', {
              details: {
                sessionId: input.sessionId,
              },
              statusCode: 400,
            });
          }

          const expectedVersion = session.version;
          return this.saveSessionWithVersion(
            repositories.sessions,
            Object.assign(session, {
              pausedAt: this.now(),
              running: false,
              version: expectedVersion + 1,
            }),
            expectedVersion,
          );
        });
      },
      input,
      key: input.idempotencyKey,
      operation: 'pauseSession',
    });
  }

  public async resetSession(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        return this.repositories.withTransaction(async (repositories) => {
          const [settings, session] = await Promise.all([
            this.getOrCreateSettings(repositories.settings, userId),
            this.getSessionOrThrow(repositories.sessions, userId, input.sessionId),
          ]);

          const expectedVersion = session.version;
          const savedSession = await this.saveSessionWithVersion(
            repositories.sessions,
            Object.assign(session, {
              pausedAt: this.now(),
              remainingSeconds: this.getDurationForMode(session.mode, settings),
              running: false,
              version: expectedVersion + 1,
            }),
            expectedVersion,
          );

          await repositories.progressEvents.save(
            repositories.progressEvents.create({
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
        });
      },
      input,
      key: input.idempotencyKey,
      operation: 'resetSession',
    });
  }

  public async skipBreak(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        return this.repositories.withTransaction(async (repositories) => {
          const [settings, session] = await Promise.all([
            this.getOrCreateSettings(repositories.settings, userId),
            this.getSessionOrThrow(repositories.sessions, userId, input.sessionId),
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

          const expectedVersion = session.version;
          return this.saveSessionWithVersion(
            repositories.sessions,
            Object.assign(session, {
              mode: PomodoroSessionMode.FOCUS,
              pausedAt: null,
              remainingSeconds: settings.focusMinutes * 60,
              running: true,
              version: expectedVersion + 1,
            }),
            expectedVersion,
          );
        });
      },
      input,
      key: input.idempotencyKey,
      operation: 'skipBreak',
    });
  }

  public async completeFocusCycle(userId: string, input: SessionMutationInput) {
    return this.idempotencyService.run({
      execute: async () => {
        return this.repositories.withTransaction(async (repositories) => {
          const [settings, session] = await Promise.all([
            this.getOrCreateSettings(repositories.settings, userId),
            this.getSessionOrThrow(repositories.sessions, userId, input.sessionId),
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

          const task = await repositories.tasks.findByIdForUser(session.taskId, userId, {
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
          if (
            task.actualPomodoros >= task.estimatedPomodoros &&
            task.status === TaskStatus.ACTIVE
          ) {
            task.status = TaskStatus.COMPLETED;
            task.completedAt = this.now();
          }

          const nextFocusCyclesCompleted = session.focusCyclesCompleted + 1;
          const nextMode =
            nextFocusCyclesCompleted % settings.longBreakInterval === 0
              ? PomodoroSessionMode.LONG_BREAK
              : PomodoroSessionMode.BREAK;
          const expectedVersion = session.version;

          const [savedTask, savedSession] = await Promise.all([
            repositories.tasks.save(task),
            this.saveSessionWithVersion(
              repositories.sessions,
              Object.assign(session, {
                focusCyclesCompleted: nextFocusCyclesCompleted,
                mode: nextMode,
                pausedAt: null,
                remainingSeconds: this.getDurationForMode(nextMode, settings),
                running: true,
                version: expectedVersion + 1,
              }),
              expectedVersion,
            ),
          ]);

          await repositories.progressEvents.save(
            repositories.progressEvents.create({
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
        });
      },
      input,
      key: input.idempotencyKey,
      operation: 'completeFocusCycle',
    });
  }

  private async getSessionOrThrow(
    sessionRepository: SessionRepositoryContract,
    userId: string,
    sessionId: string,
  ) {
    const session = await sessionRepository.findByIdForUser(sessionId, userId);
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

  private async getOrCreateSettings(
    settingsRepository: SettingsRepositoryContract,
    userId: string,
  ) {
    const existing = await settingsRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    return settingsRepository.save(
      settingsRepository.create({
        alarmSound: 'classic',
        alarmVolume: 80,
        backgroundSoundEnabled: false,
        backgroundSoundType: null,
        focusMinutes: 25,
        longBreakInterval: 4,
        longBreakMinutes: 15,
        shortBreakMinutes: 5,
        updatedBy: userId,
        userId,
      }),
    );
  }

  private async saveSessionWithVersion(
    sessionRepository: SessionRepositoryContract,
    session: Parameters<SessionRepositoryContract['save']>[0],
    expectedVersion: number,
  ) {
    const savedSession = await sessionRepository.saveWithVersion(session, expectedVersion);
    if (!savedSession) {
      throw new ServiceError(
        'CONCURRENT_UPDATE_CONFLICT',
        'session was modified by another request',
        {
          details: {
            expectedVersion,
            sessionId: session.id,
          },
          statusCode: 409,
        },
      );
    }

    return savedSession;
  }

  private getDurationForMode(
    mode: PomodoroSessionMode,
    settings: Awaited<ReturnType<SettingsRepositoryContract['findByUserId']>> & {
      focusMinutes: number;
      longBreakMinutes: number;
      shortBreakMinutes: number;
    },
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
