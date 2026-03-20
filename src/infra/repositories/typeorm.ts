import { QueryFailedError, type DataSource, type EntityManager, type Repository } from 'typeorm';

import {
  IdempotencyKey,
  PomodoroSession,
  Task,
  TaskProgressEvent,
  TaskStatus,
  UserSettings,
} from '../../domain/entities';
import {
  buildTaskWhere,
  type IdempotencyKeyRepositoryContract,
  type ProgressEventRepositoryContract,
  type RepositoryBundle,
  type SessionRepositoryContract,
  type SettingsRepositoryContract,
  type TaskListOptions,
  type TaskRepositoryContract,
} from '../../domain/repositories';

class TypeOrmTaskRepository implements TaskRepositoryContract {
  public constructor(private readonly repository: Repository<Task>) {}

  public create(task: Partial<Task>): Task {
    return this.repository.create(task);
  }

  public async findByIdForUser(
    taskId: string,
    userId: string,
    options: TaskListOptions = {},
  ): Promise<Task | null> {
    return this.repository.findOne({
      where: buildTaskWhere(
        {
          id: taskId,
          userId,
        },
        options,
      ),
    });
  }

  public async findByUser(userId: string, options: TaskListOptions = {}): Promise<Task[]> {
    const where = buildTaskWhere(
      {
        userId,
      },
      options,
    );

    if (options.status) {
      where.status = options.status as TaskStatus;
    }

    return this.repository.find({
      order: {
        createdAt: 'ASC',
      },
      where,
    });
  }

  public async save(task: Task): Promise<Task> {
    return this.repository.save(task);
  }
}

class TypeOrmSessionRepository implements SessionRepositoryContract {
  public constructor(private readonly repository: Repository<PomodoroSession>) {}

  public create(session: Partial<PomodoroSession>): PomodoroSession {
    return this.repository.create(session);
  }

  public async findActiveByUser(userId: string): Promise<PomodoroSession | null> {
    return this.repository.findOne({
      order: {
        updatedAt: 'DESC',
      },
      where: {
        running: true,
        userId,
      },
    });
  }

  public async findByIdForUser(sessionId: string, userId: string): Promise<PomodoroSession | null> {
    return this.repository.findOne({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  public async findLatestByTask(userId: string, taskId: string): Promise<PomodoroSession | null> {
    return this.repository.findOne({
      order: {
        updatedAt: 'DESC',
      },
      where: {
        taskId,
        userId,
      },
    });
  }

  public async save(session: PomodoroSession): Promise<PomodoroSession> {
    return this.repository.save(session);
  }

  public async saveWithVersion(
    session: PomodoroSession,
    expectedVersion: number,
  ): Promise<PomodoroSession | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(PomodoroSession)
      .set({
        endedAt: session.endedAt,
        focusCyclesCompleted: session.focusCyclesCompleted,
        mode: session.mode,
        pausedAt: session.pausedAt,
        remainingSeconds: session.remainingSeconds,
        running: session.running,
        startedAt: session.startedAt,
        taskId: session.taskId,
        version: session.version,
      })
      .where('id = :id', { id: session.id })
      .andWhere('user_id = :userId', { userId: session.userId })
      .andWhere('version = :expectedVersion', { expectedVersion })
      .execute();

    if (!result.affected) {
      return null;
    }

    return this.findByIdForUser(session.id, session.userId);
  }
}

class TypeOrmSettingsRepository implements SettingsRepositoryContract {
  public constructor(private readonly repository: Repository<UserSettings>) {}

  public create(settings: Partial<UserSettings>): UserSettings {
    return this.repository.create(settings);
  }

  public async findByUserId(userId: string): Promise<UserSettings | null> {
    return this.repository.findOne({
      where: {
        userId,
      },
    });
  }

  public async save(settings: UserSettings): Promise<UserSettings> {
    return this.repository.save(settings);
  }
}

class TypeOrmProgressEventRepository implements ProgressEventRepositoryContract {
  public constructor(private readonly repository: Repository<TaskProgressEvent>) {}

  public create(event: Partial<TaskProgressEvent>): TaskProgressEvent {
    return this.repository.create(event);
  }

  public async save(event: TaskProgressEvent): Promise<TaskProgressEvent> {
    return this.repository.save(event);
  }
}

class TypeOrmIdempotencyKeyRepository implements IdempotencyKeyRepositoryContract {
  public constructor(private readonly repository: Repository<IdempotencyKey>) {}

  public create(entry: Partial<IdempotencyKey>): IdempotencyKey {
    return this.repository.create(entry);
  }

  public async deleteByOperationAndKey(operation: string, key: string): Promise<void> {
    await this.repository.delete({
      idemKey: key,
      operation,
    });
  }

  public async findByOperationAndKey(operation: string, key: string): Promise<IdempotencyKey | null> {
    return this.repository.findOne({
      where: {
        idemKey: key,
        operation,
      },
    });
  }

  public async insert(entry: IdempotencyKey): Promise<IdempotencyKey | null> {
    try {
      await this.repository.insert(entry as any);
      return this.findByOperationAndKey(entry.operation, entry.idemKey);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError &&
        error.driverError.code === '23505'
      ) {
        return null;
      }

      throw error;
    }
  }

  public async save(entry: IdempotencyKey): Promise<IdempotencyKey> {
    return this.repository.save(entry);
  }
}

function createTypeOrmRepositoryBundleFromManager(
  manager: Pick<EntityManager, 'getRepository'>,
  withTransaction: RepositoryBundle['withTransaction'],
): RepositoryBundle {
  return {
    idempotencyKeys: new TypeOrmIdempotencyKeyRepository(manager.getRepository(IdempotencyKey)),
    progressEvents: new TypeOrmProgressEventRepository(manager.getRepository(TaskProgressEvent)),
    sessions: new TypeOrmSessionRepository(manager.getRepository(PomodoroSession)),
    settings: new TypeOrmSettingsRepository(manager.getRepository(UserSettings)),
    tasks: new TypeOrmTaskRepository(manager.getRepository(Task)),
    withTransaction,
  };
}

export function createTypeOrmRepositoryBundle(dataSource: DataSource): RepositoryBundle {
  const withTransaction: RepositoryBundle['withTransaction'] = async (handler) =>
    dataSource.transaction(async (manager) =>
      handler(createTypeOrmRepositoryBundleFromManager(manager, async (nestedHandler) =>
        nestedHandler(createTypeOrmRepositoryBundleFromManager(manager, withTransaction)),
      )),
    );

  return createTypeOrmRepositoryBundleFromManager(dataSource.manager, withTransaction);
}
