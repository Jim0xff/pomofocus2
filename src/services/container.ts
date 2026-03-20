import type { DataSource } from 'typeorm';

import type { RepositoryBundle } from '../domain/repositories';
import { createRepositoryBundle } from '../infra/repositories';
import {
  DefaultIdempotencyService,
  type IdempotencyService,
} from './idempotency.service';
import { SessionService } from './session.service';
import { SettingsService } from './settings.service';
import { StatsService } from './stats.service';
import { TaskService } from './task.service';

export interface ServiceContainer {
  idempotency: IdempotencyService;
  sessions: SessionService;
  settings: SettingsService;
  stats: StatsService;
  tasks: TaskService;
}

export interface CreateServiceContainerOptions {
  dataSource?: DataSource | null;
  idempotencyService?: IdempotencyService;
  now?: () => Date;
  redisClient?: {
    del(key: string): Promise<number>;
    get(key: string): Promise<string | null>;
    isOpen?: boolean;
    set(
      key: string,
      value: string,
      options?: {
        EX?: number;
        NX?: boolean;
        XX?: boolean;
      },
    ): Promise<string | null>;
  } | null;
  repositories?: RepositoryBundle;
  strictIdempotency?: boolean;
}

export function createServiceContainer(
  options: CreateServiceContainerOptions = {},
): ServiceContainer {
  const repositories = options.repositories ?? createRepositoryBundle(options.dataSource);
  const now = options.now ?? (() => new Date());
  const idempotency =
    options.idempotencyService ??
    new DefaultIdempotencyService({
      now,
      redisClient: options.redisClient,
      repositories,
      strictMode: options.strictIdempotency ?? false,
    });

  const settings = new SettingsService(repositories, idempotency);
  const tasks = new TaskService(repositories, idempotency, now);
  const stats = new StatsService(repositories.tasks, settings, now);
  const sessions = new SessionService(repositories, idempotency, now);

  return {
    idempotency,
    sessions,
    settings,
    stats,
    tasks,
  };
}
