import type { DataSource } from 'typeorm';

import {
  IdempotencyKey,
  PomodoroSession,
  Task,
  TaskProgressEvent,
  UserSettings,
} from '../entities';
import type { TaskStatus } from '../entities';

export interface TaskListOptions {
  includeArchived?: boolean;
  status?: TaskStatus | string;
}

export interface TaskRepositoryContract {
  create(task: Partial<Task>): Task;
  findByIdForUser(taskId: string, userId: string, options?: TaskListOptions): Promise<Task | null>;
  findByUser(userId: string, options?: TaskListOptions): Promise<Task[]>;
  save(task: Task): Promise<Task>;
}

export interface SessionRepositoryContract {
  create(session: Partial<PomodoroSession>): PomodoroSession;
  findActiveByUser(userId: string): Promise<PomodoroSession | null>;
  findByIdForUser(sessionId: string, userId: string): Promise<PomodoroSession | null>;
  findLatestByTask(userId: string, taskId: string): Promise<PomodoroSession | null>;
  save(session: PomodoroSession): Promise<PomodoroSession>;
  saveWithVersion(session: PomodoroSession, expectedVersion: number): Promise<PomodoroSession | null>;
}

export interface SettingsRepositoryContract {
  create(settings: Partial<UserSettings>): UserSettings;
  findByUserId(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<UserSettings>;
}

export interface ProgressEventRepositoryContract {
  create(event: Partial<TaskProgressEvent>): TaskProgressEvent;
  save(event: TaskProgressEvent): Promise<TaskProgressEvent>;
}

export interface IdempotencyKeyRepositoryContract {
  create(entry: Partial<IdempotencyKey>): IdempotencyKey;
  deleteByOperationAndKey(operation: string, key: string): Promise<void>;
  findByOperationAndKey(operation: string, key: string): Promise<IdempotencyKey | null>;
  insert(entry: IdempotencyKey): Promise<IdempotencyKey | null>;
  save(entry: IdempotencyKey): Promise<IdempotencyKey>;
}

export interface RepositoryBundle {
  idempotencyKeys: IdempotencyKeyRepositoryContract;
  progressEvents: ProgressEventRepositoryContract;
  sessions: SessionRepositoryContract;
  settings: SettingsRepositoryContract;
  tasks: TaskRepositoryContract;
  withTransaction<T>(handler: (repositories: RepositoryBundle) => Promise<T>): Promise<T>;
}

export interface RepositoryBundleFactoryOptions {
  dataSource?: DataSource | null;
}
