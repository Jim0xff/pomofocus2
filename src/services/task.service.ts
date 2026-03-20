import { TaskStatus } from '../domain/entities';
import type { TaskRepositoryContract } from '../domain/repositories';
import type { IdempotencyService } from './idempotency.service';
import { ServiceError } from './service-error';

export interface CreateTaskInput {
  estimatedPomodoros: number;
  idempotencyKey: string;
  title: string;
}

export interface ArchiveTaskInput {
  idempotencyKey: string;
  reason?: string | null;
  taskId: string;
}

export interface CompleteTaskInput {
  idempotencyKey: string;
  taskId: string;
}

export class TaskService {
  public constructor(
    private readonly taskRepository: TaskRepositoryContract,
    private readonly idempotencyService: IdempotencyService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async listTasks(
    userId: string,
    options: { includeArchived?: boolean; status?: string | null },
  ) {
    return this.taskRepository.findByUser(userId, {
      includeArchived: options.includeArchived ?? false,
      status: options.status ?? undefined,
    });
  }

  public async createTask(userId: string, input: CreateTaskInput) {
    if (!Number.isInteger(input.estimatedPomodoros) || input.estimatedPomodoros <= 0) {
      throw new ServiceError('INVALID_TASK', 'estimatedPomodoros must be a positive integer.', {
        details: {
          field: 'estimatedPomodoros',
        },
        statusCode: 400,
      });
    }

    const title = input.title.trim();
    if (!title) {
      throw new ServiceError('INVALID_TASK', 'title is required.', {
        details: {
          field: 'title',
        },
        statusCode: 400,
      });
    }

    return this.idempotencyService.run({
      execute: async () =>
        this.taskRepository.save(
          this.taskRepository.create({
            actualPomodoros: 0,
            completedAt: null,
            deletedAt: null,
            deletedBy: null,
            estimatedPomodoros: input.estimatedPomodoros,
            status: TaskStatus.ACTIVE,
            title,
            userId,
          }),
        ),
      input,
      key: input.idempotencyKey,
      operation: 'createTask',
    });
  }

  public async archiveTask(userId: string, input: ArchiveTaskInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const task = await this.getTaskOrThrow(userId, input.taskId, true);
        const now = this.now();

        task.status = TaskStatus.ARCHIVED;
        task.deletedAt = now;
        task.deletedBy = userId;

        await this.taskRepository.save(task);

        return {
          code: 200,
          message: input.reason?.trim() ? `ok: ${input.reason.trim()}` : 'ok',
        };
      },
      input,
      key: input.idempotencyKey,
      operation: 'archiveTask',
    });
  }

  public async completeTask(userId: string, input: CompleteTaskInput) {
    return this.idempotencyService.run({
      execute: async () => {
        const task = await this.getTaskOrThrow(userId, input.taskId, false);

        if (task.status !== TaskStatus.ACTIVE) {
          throw new ServiceError('INVALID_TASK_STATE', 'Only active tasks can be completed.', {
            details: {
              status: task.status,
              taskId: input.taskId,
            },
            statusCode: 400,
          });
        }

        task.status = TaskStatus.COMPLETED;
        task.completedAt = this.now();

        return this.taskRepository.save(task);
      },
      input,
      key: input.idempotencyKey,
      operation: 'completeTask',
    });
  }

  public async getTaskOrThrow(userId: string, taskId: string, includeArchived: boolean) {
    const task = await this.taskRepository.findByIdForUser(taskId, userId, {
      includeArchived,
    });

    if (!task) {
      throw new ServiceError('TASK_NOT_FOUND', 'task not found', {
        details: {
          taskId,
        },
        statusCode: 404,
      });
    }

    return task;
  }
}
