import type { DataSource } from 'typeorm';

import type { RepositoryBundle } from '../domain/repositories';
import { createRepositoryBundle } from '../infra/repositories';
import {
  PassthroughIdempotencyService,
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
  repositories?: RepositoryBundle;
}

export function createServiceContainer(
  options: CreateServiceContainerOptions = {},
): ServiceContainer {
  const repositories = options.repositories ?? createRepositoryBundle(options.dataSource);
  const idempotency = options.idempotencyService ?? new PassthroughIdempotencyService();
  const now = options.now ?? (() => new Date());

  const settings = new SettingsService(repositories.settings);
  const tasks = new TaskService(repositories.tasks, idempotency, now);
  const stats = new StatsService(repositories.tasks, settings, now);
  const sessions = new SessionService(
    repositories.sessions,
    repositories.tasks,
    repositories.progressEvents,
    settings,
    idempotency,
    now,
  );

  return {
    idempotency,
    sessions,
    settings,
    stats,
    tasks,
  };
}
