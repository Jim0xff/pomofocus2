import { gql } from 'apollo-server-express';

import { AppError } from '../errors/app-error';
import { HttpError } from '../errors/http-error';
import { requireAuth } from '../middleware/auth';
import type { ServiceContainer } from '../services';

export interface GraphQLContext {
  requestId: string;
  services: ServiceContainer;
  user: {
    claims: Record<string, unknown>;
    subject: string | null;
    token: string;
  } | null;
}

type ResolverHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
  parent: unknown,
  args: TArgs,
  context: GraphQLContext,
) => Promise<TResult> | TResult;

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapTask(task: {
  actualPomodoros: number;
  completedAt?: Date | null;
  createdAt?: Date;
  estimatedPomodoros: number;
  id: string;
  status: string;
  title: string;
  updatedAt?: Date;
}) {
  return {
    actualPomodoros: task.actualPomodoros,
    completedAt: toIsoString(task.completedAt),
    createdAt: toIsoString(task.createdAt) ?? new Date(0).toISOString(),
    estimatedPomodoros: task.estimatedPomodoros,
    id: task.id,
    status: task.status,
    title: task.title,
    updatedAt: toIsoString(task.updatedAt) ?? new Date(0).toISOString(),
  };
}

function mapSession(
  session:
    | {
        focusCyclesCompleted: number;
        id: string;
        mode: string;
        remainingSeconds: number;
        restorable?: boolean;
        running: boolean;
        taskId: string;
        updatedAt?: Date;
        version: number;
      }
    | null,
) {
  if (!session) {
    return null;
  }

  return {
    focusCyclesCompleted: session.focusCyclesCompleted,
    id: session.id,
    mode: session.mode,
    remainingSeconds: session.remainingSeconds,
    restorable: session.restorable ?? false,
    running: session.running,
    taskId: session.taskId,
    updatedAt: toIsoString(session.updatedAt) ?? new Date(0).toISOString(),
    version: session.version,
  };
}

function mapSettings(settings: {
  alarmSound: string;
  alarmVolume: number;
  backgroundSoundEnabled: boolean;
  backgroundSoundType: string | null;
  focusMinutes: number;
  longBreakInterval: number;
  longBreakMinutes: number;
  shortBreakMinutes: number;
}) {
  return {
    alarmSound: settings.alarmSound,
    alarmVolume: settings.alarmVolume,
    backgroundSoundEnabled: settings.backgroundSoundEnabled,
    backgroundSoundType: settings.backgroundSoundType,
    focusMinutes: settings.focusMinutes,
    longBreakInterval: settings.longBreakInterval,
    longBreakMinutes: settings.longBreakMinutes,
    shortBreakMinutes: settings.shortBreakMinutes,
  };
}

function mapTodayStats(stats: {
  completedPomodoros: number;
  completedTasks: number;
  estimatedFinishAt: Date;
  totalTasks: number;
}) {
  return {
    completedPomodoros: stats.completedPomodoros,
    completedTasks: stats.completedTasks,
    estimatedFinishAt: stats.estimatedFinishAt.toISOString(),
    totalTasks: stats.totalTasks,
  };
}

function mapEstimateFinishTime(result: {
  basedOnFocusMinutes: number;
  estimatedFinishAt: Date;
  remainingPomodoros: number;
}) {
  return {
    basedOnFocusMinutes: result.basedOnFocusMinutes,
    estimatedFinishAt: result.estimatedFinishAt.toISOString(),
    remainingPomodoros: result.remainingPomodoros,
  };
}

function scopeError(error: unknown, requestId: string): never {
  if (error instanceof AppError) {
    throw new AppError(error.code, error.message, {
      cause: error.cause,
      details: error.details,
      requestId: error.requestId ?? requestId,
      statusCode: error.statusCode,
    });
  }

  throw new HttpError(500, 'INTERNAL_SERVER_ERROR', 'Internal server error', {
    cause: error,
    requestId,
  });
}

function resolver<TArgs, TResult>(handler: ResolverHandler<TArgs, TResult>): ResolverHandler<TArgs, TResult> {
  return async (parent, args, context) => {
    try {
      return await handler(parent, args, context);
    } catch (error) {
      scopeError(error, context.requestId);
    }
  };
}

function getUserId(context: GraphQLContext): string {
  requireAuth(context.user, context.requestId);

  if (!context.user?.subject) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication subject is required.', {
      requestId: context.requestId,
    });
  }

  return context.user.subject;
}

export const typeDefs = gql`
  type MutationStatus {
    code: Int!
    message: String!
    requestId: String!
  }

  type PingResponse {
    message: String!
    requestId: String!
    timestamp: String!
  }

  type Task {
    id: ID!
    title: String!
    estimatedPomodoros: Int!
    actualPomodoros: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
    completedAt: String
  }

  type SessionState {
    id: ID!
    taskId: ID!
    mode: String!
    running: Boolean!
    remainingSeconds: Int!
    focusCyclesCompleted: Int!
    version: Int!
    updatedAt: String!
    restorable: Boolean!
  }

  type Settings {
    focusMinutes: Int!
    shortBreakMinutes: Int!
    longBreakMinutes: Int!
    longBreakInterval: Int!
    alarmSound: String!
    alarmVolume: Int!
    backgroundSoundEnabled: Boolean!
    backgroundSoundType: String
  }

  type TodayStats {
    completedTasks: Int!
    totalTasks: Int!
    completedPomodoros: Int!
    estimatedFinishAt: String!
  }

  type EstimateFinishTimeResult {
    estimatedFinishAt: String!
    remainingPomodoros: Int!
    basedOnFocusMinutes: Int!
  }

  type CompleteFocusCyclePayload {
    session: SessionState!
    task: Task!
    stats: TodayStats!
  }

  input CreateTaskInput {
    title: String!
    estimatedPomodoros: Int!
    idempotencyKey: String!
  }

  input ArchiveTaskInput {
    taskId: ID!
    reason: String
    idempotencyKey: String!
  }

  input StartSessionInput {
    taskId: ID
    idempotencyKey: String!
  }

  input PauseSessionInput {
    sessionId: ID!
    idempotencyKey: String!
  }

  input ResetSessionInput {
    sessionId: ID!
    idempotencyKey: String!
  }

  input SkipBreakInput {
    sessionId: ID!
    idempotencyKey: String!
  }

  input CompleteFocusCycleInput {
    sessionId: ID!
    idempotencyKey: String!
  }

  input CompleteTaskInput {
    taskId: ID!
    idempotencyKey: String!
  }

  input UpdateSettingsInput {
    focusMinutes: Int
    shortBreakMinutes: Int
    longBreakMinutes: Int
    longBreakInterval: Int
    alarmSound: String
    alarmVolume: Int
    backgroundSoundEnabled: Boolean
    backgroundSoundType: String
    idempotencyKey: String!
  }

  input EstimateFinishTimeInput {
    date: String!
    includeBreak: Boolean!
  }

  type Query {
    ping: PingResponse!
    listTasks(status: String, includeArchived: Boolean): [Task!]!
    getSessionState(taskId: ID): SessionState
    getSettings: Settings!
    todayStats: TodayStats!
    estimateFinishTime(input: EstimateFinishTimeInput!): EstimateFinishTimeResult!
  }

  type Mutation {
    createTask(input: CreateTaskInput!): Task!
    archiveTask(input: ArchiveTaskInput!): MutationStatus!
    startSession(input: StartSessionInput!): SessionState!
    pauseSession(input: PauseSessionInput!): SessionState!
    resetSession(input: ResetSessionInput!): SessionState!
    skipBreak(input: SkipBreakInput!): SessionState!
    completeFocusCycle(input: CompleteFocusCycleInput!): CompleteFocusCyclePayload!
    completeTask(input: CompleteTaskInput!): Task!
    updateSettings(input: UpdateSettingsInput!): Settings!
  }
`;

export const resolvers = {
  Mutation: {
    archiveTask: resolver(async (_parent, args: { input: { idempotencyKey: string; reason?: string | null; taskId: string } }, context) => {
      const userId = getUserId(context);
      const result = await context.services.tasks.archiveTask(userId, args.input);
      return {
        ...result,
        requestId: context.requestId,
      };
    }),
    completeFocusCycle: resolver(async (_parent, args: { input: { idempotencyKey: string; sessionId: string } }, context) => {
      const userId = getUserId(context);
      const result = await context.services.sessions.completeFocusCycle(userId, args.input);
      const stats = await context.services.stats.todayStats(userId);

      return {
        session: mapSession(result.session),
        stats: mapTodayStats(stats),
        task: mapTask(result.task),
      };
    }),
    completeTask: resolver(async (_parent, args: { input: { idempotencyKey: string; taskId: string } }, context) => {
      const userId = getUserId(context);
      return mapTask(await context.services.tasks.completeTask(userId, args.input));
    }),
    createTask: resolver(async (_parent, args: { input: { estimatedPomodoros: number; idempotencyKey: string; title: string } }, context) => {
      const userId = getUserId(context);
      return mapTask(await context.services.tasks.createTask(userId, args.input));
    }),
    pauseSession: resolver(async (_parent, args: { input: { idempotencyKey: string; sessionId: string } }, context) => {
      const userId = getUserId(context);
      return mapSession(await context.services.sessions.pauseSession(userId, args.input));
    }),
    resetSession: resolver(async (_parent, args: { input: { idempotencyKey: string; sessionId: string } }, context) => {
      const userId = getUserId(context);
      return mapSession(await context.services.sessions.resetSession(userId, args.input));
    }),
    skipBreak: resolver(async (_parent, args: { input: { idempotencyKey: string; sessionId: string } }, context) => {
      const userId = getUserId(context);
      return mapSession(await context.services.sessions.skipBreak(userId, args.input));
    }),
    startSession: resolver(async (_parent, args: { input: { idempotencyKey: string; taskId?: string | null } }, context) => {
      const userId = getUserId(context);
      return mapSession(await context.services.sessions.startSession(userId, args.input));
    }),
    updateSettings: resolver(async (_parent, args: { input: { idempotencyKey: string } & Record<string, unknown> }, context) => {
      const userId = getUserId(context);
      return mapSettings(
        await context.services.settings.updateSettings(userId, {
          alarmSound: typeof args.input.alarmSound === 'string' ? args.input.alarmSound : undefined,
          alarmVolume: typeof args.input.alarmVolume === 'number' ? args.input.alarmVolume : undefined,
          backgroundSoundEnabled:
            typeof args.input.backgroundSoundEnabled === 'boolean'
              ? args.input.backgroundSoundEnabled
              : undefined,
          backgroundSoundType:
            typeof args.input.backgroundSoundType === 'string' || args.input.backgroundSoundType === null
              ? (args.input.backgroundSoundType as string | null)
              : undefined,
          focusMinutes: typeof args.input.focusMinutes === 'number' ? args.input.focusMinutes : undefined,
          idempotencyKey: args.input.idempotencyKey,
          longBreakInterval:
            typeof args.input.longBreakInterval === 'number'
              ? args.input.longBreakInterval
              : undefined,
          longBreakMinutes:
            typeof args.input.longBreakMinutes === 'number' ? args.input.longBreakMinutes : undefined,
          shortBreakMinutes:
            typeof args.input.shortBreakMinutes === 'number'
              ? args.input.shortBreakMinutes
              : undefined,
        }),
      );
    }),
  },
  Query: {
    estimateFinishTime: resolver(async (_parent, args: { input: { date: string; includeBreak: boolean } }, context) => {
      const userId = getUserId(context);
      return mapEstimateFinishTime(await context.services.stats.estimateFinishTime(userId, args.input));
    }),
    getSessionState: resolver(async (_parent, args: { taskId?: string | null }, context) => {
      const userId = getUserId(context);
      return mapSession(await context.services.sessions.getSessionState(userId, args.taskId));
    }),
    getSettings: resolver(async (_parent, _args, context) => {
      const userId = getUserId(context);
      return mapSettings(await context.services.settings.getSettings(userId));
    }),
    listTasks: resolver(async (_parent, args: { includeArchived?: boolean | null; status?: string | null }, context) => {
      const userId = getUserId(context);
      const tasks = await context.services.tasks.listTasks(userId, {
        includeArchived: args.includeArchived ?? undefined,
        status: args.status ?? undefined,
      });
      return tasks.map(mapTask);
    }),
    ping: (_parent: unknown, _args: unknown, context: GraphQLContext) => ({
      message: 'Pomofocus2 backend scaffold is running.',
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
    }),
    todayStats: resolver(async (_parent, _args, context) => {
      const userId = getUserId(context);
      return mapTodayStats(await context.services.stats.todayStats(userId));
    }),
  },
};

export function formatGraphQLError(error: Error & { originalError?: unknown }): {
  extensions: Record<string, unknown>;
  message: string;
} {
  if (error.originalError instanceof AppError) {
    return {
      message: error.originalError.message,
      extensions: {
        code: error.originalError.code,
        details: error.originalError.details,
        requestId: error.originalError.requestId,
        statusCode: error.originalError.statusCode,
      },
    };
  }

  return {
    message: 'Internal server error',
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
    },
  };
}
