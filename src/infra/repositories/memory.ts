import {
  IdempotencyKey,
  IdempotencyKeyStatus,
  PomodoroSession,
  Task,
  TaskProgressEvent,
  TaskStatus,
  UserSettings,
} from '../../domain/entities';
import type {
  IdempotencyKeyRepositoryContract,
  ProgressEventRepositoryContract,
  RepositoryBundle,
  SessionRepositoryContract,
  SettingsRepositoryContract,
  TaskListOptions,
  TaskRepositoryContract,
} from '../../domain/repositories/contracts';

function cloneTask(task: Task): Task {
  return Object.assign(new Task(), {
    ...task,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
    createdAt: new Date(task.createdAt),
    deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
    updatedAt: new Date(task.updatedAt),
  });
}

function cloneIdempotencyKey(entry: IdempotencyKey): IdempotencyKey {
  return Object.assign(new IdempotencyKey(), {
    ...entry,
    createdAt: new Date(entry.createdAt),
    expiresAt: new Date(entry.expiresAt),
    responseSnapshot: entry.responseSnapshot ? structuredClone(entry.responseSnapshot) : null,
    updatedAt: new Date(entry.updatedAt),
  });
}

function cloneSession(session: PomodoroSession): PomodoroSession {
  return Object.assign(new PomodoroSession(), {
    ...session,
    createdAt: new Date(session.createdAt),
    endedAt: session.endedAt ? new Date(session.endedAt) : null,
    pausedAt: session.pausedAt ? new Date(session.pausedAt) : null,
    startedAt: session.startedAt ? new Date(session.startedAt) : null,
    updatedAt: new Date(session.updatedAt),
  });
}

function cloneSettings(settings: UserSettings): UserSettings {
  return Object.assign(new UserSettings(), {
    ...settings,
    createdAt: new Date(settings.createdAt),
    updatedAt: new Date(settings.updatedAt),
  });
}

function cloneEvent(event: TaskProgressEvent): TaskProgressEvent {
  return Object.assign(new TaskProgressEvent(), {
    ...event,
    createdAt: new Date(event.createdAt),
    payload: event.payload ? { ...event.payload } : null,
  });
}

class MemoryTaskRepository implements TaskRepositoryContract {
  public constructor(
    private readonly tasks: Map<string, Task>,
    private readonly nextId: () => string,
  ) {}

  public create(task: Partial<Task>): Task {
    return Object.assign(new Task(), task);
  }

  public async findByIdForUser(
    taskId: string,
    userId: string,
    options: TaskListOptions = {},
  ): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task || task.userId !== userId) {
      return null;
    }

    if (!options.includeArchived && (task.status === TaskStatus.ARCHIVED || task.deletedAt !== null)) {
      return null;
    }

    return cloneTask(task);
  }

  public async findByUser(userId: string, options: TaskListOptions = {}): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter((task) => task.userId === userId)
      .filter((task) => options.includeArchived || (task.status !== TaskStatus.ARCHIVED && task.deletedAt === null))
      .filter((task) => (options.status ? task.status === options.status : true))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(cloneTask);
  }

  public async save(task: Task): Promise<Task> {
    const now = new Date();
    const persisted = cloneTask(task);
    if (!persisted.id) {
      persisted.id = this.nextId();
      persisted.createdAt = now;
    }

    persisted.updatedAt = now;
    this.tasks.set(persisted.id, cloneTask(persisted));

    return cloneTask(persisted);
  }
}

class MemorySessionRepository implements SessionRepositoryContract {
  public constructor(
    private readonly sessions: Map<string, PomodoroSession>,
    private readonly nextId: () => string,
  ) {}

  public create(session: Partial<PomodoroSession>): PomodoroSession {
    return Object.assign(new PomodoroSession(), session);
  }

  public async findActiveByUser(userId: string): Promise<PomodoroSession | null> {
    const session = Array.from(this.sessions.values())
      .filter((candidate) => candidate.userId === userId && candidate.running)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];

    return session ? cloneSession(session) : null;
  }

  public async findByIdForUser(sessionId: string, userId: string): Promise<PomodoroSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }

    return cloneSession(session);
  }

  public async findLatestByTask(userId: string, taskId: string): Promise<PomodoroSession | null> {
    const session = Array.from(this.sessions.values())
      .filter((candidate) => candidate.userId === userId && candidate.taskId === taskId)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];

    return session ? cloneSession(session) : null;
  }

  public async save(session: PomodoroSession): Promise<PomodoroSession> {
    const now = new Date();
    const persisted = cloneSession(session);
    if (!persisted.id) {
      persisted.id = this.nextId();
      persisted.createdAt = now;
    }

    persisted.updatedAt = now;
    this.sessions.set(persisted.id, cloneSession(persisted));

    return cloneSession(persisted);
  }

  public async saveWithVersion(
    session: PomodoroSession,
    expectedVersion: number,
  ): Promise<PomodoroSession | null> {
    const current = session.id ? this.sessions.get(session.id) : undefined;
    if (!current || current.version !== expectedVersion) {
      return null;
    }

    return this.save(session);
  }
}

class MemorySettingsRepository implements SettingsRepositoryContract {
  public constructor(
    private readonly settingsMap: Map<string, UserSettings>,
    private readonly nextId: () => string,
  ) {}

  public create(settings: Partial<UserSettings>): UserSettings {
    return Object.assign(new UserSettings(), settings);
  }

  public async findByUserId(userId: string): Promise<UserSettings | null> {
    const settings = this.settingsMap.get(userId);
    return settings ? cloneSettings(settings) : null;
  }

  public async save(settings: UserSettings): Promise<UserSettings> {
    const now = new Date();
    const persisted = cloneSettings(settings);
    if (!persisted.id) {
      persisted.id = this.nextId();
      persisted.createdAt = now;
    }

    persisted.updatedAt = now;
    this.settingsMap.set(persisted.userId, cloneSettings(persisted));

    return cloneSettings(persisted);
  }
}

class MemoryProgressEventRepository implements ProgressEventRepositoryContract {
  public constructor(
    private readonly events: Map<string, TaskProgressEvent>,
    private readonly nextId: () => string,
  ) {}

  public create(event: Partial<TaskProgressEvent>): TaskProgressEvent {
    return Object.assign(new TaskProgressEvent(), event);
  }

  public async save(event: TaskProgressEvent): Promise<TaskProgressEvent> {
    const persisted = cloneEvent(event);
    if (!persisted.id) {
      persisted.id = this.nextId();
      persisted.createdAt = new Date();
    }

    this.events.set(persisted.id, cloneEvent(persisted));
    return cloneEvent(persisted);
  }
}

class MemoryIdempotencyKeyRepository implements IdempotencyKeyRepositoryContract {
  public constructor(
    private readonly entries: Map<string, IdempotencyKey>,
    private readonly nextId: () => string,
  ) {}

  public create(entry: Partial<IdempotencyKey>): IdempotencyKey {
    return Object.assign(new IdempotencyKey(), {
      lockOwner: null,
      responseSnapshot: null,
      status: IdempotencyKeyStatus.PENDING,
      ...entry,
    });
  }

  public async deleteByOperationAndKey(operation: string, key: string): Promise<void> {
    this.entries.delete(`${operation}:${key}`);
  }

  public async findByOperationAndKey(operation: string, key: string): Promise<IdempotencyKey | null> {
    const entry = this.entries.get(`${operation}:${key}`);
    return entry ? cloneIdempotencyKey(entry) : null;
  }

  public async insert(entry: IdempotencyKey): Promise<IdempotencyKey | null> {
    const compositeKey = `${entry.operation}:${entry.idemKey}`;
    if (this.entries.has(compositeKey)) {
      return null;
    }

    const now = new Date();
    const persisted = cloneIdempotencyKey(
      Object.assign(entry, {
        createdAt: entry.createdAt ?? now,
        id: entry.id || this.nextId(),
        updatedAt: entry.updatedAt ?? now,
      }),
    );
    this.entries.set(compositeKey, cloneIdempotencyKey(persisted));
    return cloneIdempotencyKey(persisted);
  }

  public async save(entry: IdempotencyKey): Promise<IdempotencyKey> {
    const compositeKey = `${entry.operation}:${entry.idemKey}`;
    const existing = this.entries.get(compositeKey);
    const now = new Date();
    const persisted = cloneIdempotencyKey(
      Object.assign(entry, {
        createdAt: existing?.createdAt ?? entry.createdAt ?? now,
        id: existing?.id ?? entry.id ?? this.nextId(),
        updatedAt: now,
      }),
    );
    this.entries.set(compositeKey, cloneIdempotencyKey(persisted));
    return cloneIdempotencyKey(persisted);
  }
}

export class MemoryRepositoryBundle implements RepositoryBundle {
  private taskIdSequence = 0;
  private sessionIdSequence = 0;
  private settingsIdSequence = 0;
  private eventIdSequence = 0;
  private idempotencyIdSequence = 0;

  private readonly tasksMap = new Map<string, Task>();
  private readonly sessionsMap = new Map<string, PomodoroSession>();
  private readonly settingsMap = new Map<string, UserSettings>();
  private readonly eventsMap = new Map<string, TaskProgressEvent>();
  private readonly idempotencyMap = new Map<string, IdempotencyKey>();

  public readonly idempotencyKeys: IdempotencyKeyRepositoryContract;
  public readonly progressEvents: ProgressEventRepositoryContract;
  public readonly sessions: SessionRepositoryContract;
  public readonly settings: SettingsRepositoryContract;
  public readonly tasks: TaskRepositoryContract;

  public constructor() {
    this.tasks = new MemoryTaskRepository(this.tasksMap, () => String(++this.taskIdSequence));
    this.sessions = new MemorySessionRepository(this.sessionsMap, () => String(++this.sessionIdSequence));
    this.settings = new MemorySettingsRepository(
      this.settingsMap,
      () => String(++this.settingsIdSequence),
    );
    this.progressEvents = new MemoryProgressEventRepository(
      this.eventsMap,
      () => String(++this.eventIdSequence),
    );
    this.idempotencyKeys = new MemoryIdempotencyKeyRepository(
      this.idempotencyMap,
      () => String(++this.idempotencyIdSequence),
    );
  }

  public async withTransaction<T>(handler: (repositories: RepositoryBundle) => Promise<T>): Promise<T> {
    const snapshot = this.createSnapshot();

    try {
      return await handler(this);
    } catch (error) {
      this.restoreSnapshot(snapshot);
      throw error;
    }
  }

  private createSnapshot() {
    return {
      eventIdSequence: this.eventIdSequence,
      events: new Map(
        Array.from(this.eventsMap.entries(), ([key, value]) => [key, cloneEvent(value)]),
      ),
      idempotencyEntries: new Map(
        Array.from(this.idempotencyMap.entries(), ([key, value]) => [
          key,
          cloneIdempotencyKey(value),
        ]),
      ),
      idempotencyIdSequence: this.idempotencyIdSequence,
      sessionIdSequence: this.sessionIdSequence,
      sessions: new Map(
        Array.from(this.sessionsMap.entries(), ([key, value]) => [key, cloneSession(value)]),
      ),
      settings: new Map(
        Array.from(this.settingsMap.entries(), ([key, value]) => [key, cloneSettings(value)]),
      ),
      settingsIdSequence: this.settingsIdSequence,
      taskIdSequence: this.taskIdSequence,
      tasks: new Map(
        Array.from(this.tasksMap.entries(), ([key, value]) => [key, cloneTask(value)]),
      ),
    };
  }

  private restoreSnapshot(snapshot: ReturnType<MemoryRepositoryBundle['createSnapshot']>): void {
    this.taskIdSequence = snapshot.taskIdSequence;
    this.sessionIdSequence = snapshot.sessionIdSequence;
    this.settingsIdSequence = snapshot.settingsIdSequence;
    this.eventIdSequence = snapshot.eventIdSequence;
    this.idempotencyIdSequence = snapshot.idempotencyIdSequence;

    this.restoreMap(this.tasksMap, snapshot.tasks);
    this.restoreMap(this.sessionsMap, snapshot.sessions);
    this.restoreMap(this.settingsMap, snapshot.settings);
    this.restoreMap(this.eventsMap, snapshot.events);
    this.restoreMap(this.idempotencyMap, snapshot.idempotencyEntries);
  }

  private restoreMap<T>(target: Map<string, T>, snapshot: Map<string, T>): void {
    target.clear();
    for (const [key, value] of snapshot.entries()) {
      target.set(key, value);
    }
  }
}
