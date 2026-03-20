import { IsNull, Not, type FindOptionsWhere } from 'typeorm';

import { Task } from '../entities';
import { TaskStatus } from '../entities';

export interface TaskVisibilityOptions {
  includeArchived?: boolean;
}

export function buildTaskWhere(
  baseWhere: FindOptionsWhere<Task> = {},
  options: TaskVisibilityOptions = {},
): FindOptionsWhere<Task> {
  if (options.includeArchived) {
    return { ...baseWhere };
  }

  return {
    ...baseWhere,
    deletedAt: IsNull(),
    status: Not(TaskStatus.ARCHIVED),
  };
}

export interface TaskQueryBuilderLike {
  andWhere(condition: string, parameters?: Record<string, unknown>): TaskQueryBuilderLike;
}

export function applyTaskVisibilityFilter<T extends TaskQueryBuilderLike>(
  queryBuilder: T,
  alias = 'task',
  options: TaskVisibilityOptions = {},
): T {
  if (options.includeArchived) {
    return queryBuilder;
  }

  queryBuilder.andWhere(`${alias}.status != :archivedStatus`, {
    archivedStatus: TaskStatus.ARCHIVED,
  });
  queryBuilder.andWhere(`${alias}.deleted_at IS NULL`);

  return queryBuilder;
}
