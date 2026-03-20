import { type DataSource, type Repository } from 'typeorm';

import {
  PomodoroSession,
  Task,
  TaskProgressEvent,
  TaskStatus,
  UserSettings,
} from '../../domain/entities';
import {
  buildTaskWhere,
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

export function createTypeOrmRepositoryBundle(dataSource: DataSource): RepositoryBundle {
  return {
    progressEvents: new TypeOrmProgressEventRepository(dataSource.getRepository(TaskProgressEvent)),
    sessions: new TypeOrmSessionRepository(dataSource.getRepository(PomodoroSession)),
    settings: new TypeOrmSettingsRepository(dataSource.getRepository(UserSettings)),
    tasks: new TypeOrmTaskRepository(dataSource.getRepository(Task)),
  };
}
