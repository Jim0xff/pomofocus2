import { ApolloServer } from 'apollo-server-express';

import { typeDefs, resolvers, formatGraphQLError, type GraphQLContext } from '../../src/graphql/schema';
import { MemoryRepositoryBundle } from '../../src/infra/repositories/memory';
import { createServiceContainer, type ServiceContainer } from '../../src/services';

function createBearerToken(subjectOrClaims: string | Record<string, unknown>): string {
  const encode = (value: string) => Buffer.from(value).toString('base64url');
  const claims =
    typeof subjectOrClaims === 'string' ? { sub: subjectOrClaims } : subjectOrClaims;
  return `${encode('{"alg":"none","typ":"JWT"}')}.${encode(JSON.stringify(claims))}.signature`;
}

async function createTestServer(contextOverrides: Partial<GraphQLContext> = {}) {
  const repositories = new MemoryRepositoryBundle();
  const services = createServiceContainer({
    now: () => new Date('2026-03-20T12:00:00.000Z'),
    repositories,
  });

  const context: GraphQLContext = {
    requestId: 'req-test-123',
    services,
    user: {
      claims: { sub: 'user-1' },
      subject: 'user-1',
      token: createBearerToken('user-1'),
    },
    ...contextOverrides,
  };

  const server = new ApolloServer({
    context: async () => context,
    formatError: formatGraphQLError,
    resolvers,
    typeDefs,
  });

  await server.start();

  return {
    context,
    repositories,
    server,
    services,
  };
}

describe('graphql schema', () => {
  it('requires auth for core queries and includes requestId in GraphQL errors', async () => {
    const { server } = await createTestServer({
      requestId: 'req-auth-001',
      user: null,
    });

    const response = await server.executeOperation({
      query: 'query { listTasks { id } }',
    });

    expect(response.data).toBeNull();
    expect(response.errors?.[0].message).toBe('Authentication is required.');
    expect(response.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
    expect(response.errors?.[0].extensions?.requestId).toBe('req-auth-001');

    await server.stop();
  });

  it('rejects authenticated requests that do not include a subject claim', async () => {
    const { server } = await createTestServer({
      requestId: 'req-auth-subject',
      user: {
        claims: {
          aud: 'pomofocus2',
        },
        subject: null,
        token: createBearerToken({ aud: 'pomofocus2' }),
      },
    });

    const response = await server.executeOperation({
      query: 'query { getSettings { focusMinutes } }',
    });

    expect(response.data).toBeNull();
    expect(response.errors?.[0].message).toBe('Authentication subject is required.');
    expect(response.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
    expect(response.errors?.[0].extensions?.requestId).toBe('req-auth-subject');

    await server.stop();
  });

  it('creates, archives, and filters tasks through GraphQL', async () => {
    const { server } = await createTestServer();

    const createResponse = await server.executeOperation({
      query: `
        mutation CreateTask($input: CreateTaskInput!) {
          createTask(input: $input) {
            id
            title
            status
          }
        }
      `,
      variables: {
        input: {
          estimatedPomodoros: 2,
          idempotencyKey: 'idem-create-1',
          title: 'Write tests',
        },
      },
    });

    const createdTaskId = createResponse.data?.createTask.id as string;

    expect(createResponse.errors).toBeUndefined();
    expect(createResponse.data?.createTask).toEqual({
      id: createdTaskId,
      status: 'active',
      title: 'Write tests',
    });

    const archiveResponse = await server.executeOperation({
      query: `
        mutation ArchiveTask($input: ArchiveTaskInput!) {
          archiveTask(input: $input) {
            code
            message
            requestId
          }
        }
      `,
      variables: {
        input: {
          idempotencyKey: 'idem-archive-1',
          reason: 'done',
          taskId: createdTaskId,
        },
      },
    });

    expect(archiveResponse.errors).toBeUndefined();
    expect(archiveResponse.data?.archiveTask).toEqual({
      code: 200,
      message: 'ok: done',
      requestId: 'req-test-123',
    });

    const listDefaultResponse = await server.executeOperation({
      query: 'query { listTasks { id title status } }',
    });
    const listArchivedResponse = await server.executeOperation({
      query: 'query { listTasks(includeArchived: true) { id title status } }',
    });

    expect(listDefaultResponse.errors).toBeUndefined();
    expect(listDefaultResponse.data?.listTasks).toEqual([]);
    expect(listArchivedResponse.errors).toBeUndefined();
    expect(listArchivedResponse.data?.listTasks).toEqual([
      {
        id: createdTaskId,
        status: 'archived',
        title: 'Write tests',
      },
    ]);

    await server.stop();
  });

  it('returns the required startSession error codes', async () => {
    const { server, services } = await createTestServer();

    const missingTaskResponse = await server.executeOperation({
      query: `
        mutation StartSession($input: StartSessionInput!) {
          startSession(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          idempotencyKey: 'idem-start-1',
          taskId: null,
        },
      },
    });

    expect(missingTaskResponse.data).toBeNull();
    expect(missingTaskResponse.errors?.[0].message).toBe('task not selected');
    expect(missingTaskResponse.errors?.[0].extensions?.code).toBe('TASK_NOT_SELECTED');
    expect(missingTaskResponse.errors?.[0].extensions?.requestId).toBe('req-test-123');

    const archivedTask = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 1,
      idempotencyKey: 'idem-create-archived',
      title: 'Archived task',
    });
    await services.tasks.archiveTask('user-1', {
      idempotencyKey: 'idem-archive-archived',
      taskId: archivedTask.id,
    });

    const archivedTaskResponse = await server.executeOperation({
      query: `
        mutation StartSession($input: StartSessionInput!) {
          startSession(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          idempotencyKey: 'idem-start-2',
          taskId: archivedTask.id,
        },
      },
    });

    expect(archivedTaskResponse.data).toBeNull();
    expect(archivedTaskResponse.errors?.[0].message).toBe('task archived cannot start session');
    expect(archivedTaskResponse.errors?.[0].extensions?.code).toBe(
      'TASK_ARCHIVED_CANNOT_START_SESSION',
    );

    await server.stop();
  });

  it('updates and reads settings and stats through GraphQL', async () => {
    const { server, services } = await createTestServer();
    const task = await services.tasks.createTask('user-1', {
      estimatedPomodoros: 2,
      idempotencyKey: 'idem-create-stats',
      title: 'Deep work',
    });
    const session = await services.sessions.startSession('user-1', {
      idempotencyKey: 'idem-start-stats',
      taskId: task.id,
    });
    await services.sessions.completeFocusCycle('user-1', {
      idempotencyKey: 'idem-cycle-stats',
      sessionId: session.id,
    });

    const updateResponse = await server.executeOperation({
      query: `
        mutation UpdateSettings($input: UpdateSettingsInput!) {
          updateSettings(input: $input) {
            focusMinutes
            alarmVolume
            backgroundSoundEnabled
            backgroundSoundType
          }
        }
      `,
      variables: {
        input: {
          alarmVolume: 70,
          backgroundSoundEnabled: true,
          backgroundSoundType: 'white_noise',
          focusMinutes: 30,
          idempotencyKey: 'idem-settings-1',
        },
      },
    });

    expect(updateResponse.errors).toBeUndefined();
    expect(updateResponse.data?.updateSettings).toEqual({
      alarmVolume: 70,
      backgroundSoundEnabled: true,
      backgroundSoundType: 'white_noise',
      focusMinutes: 30,
    });

    const statsResponse = await server.executeOperation({
      query: `
        query Stats($input: EstimateFinishTimeInput!) {
          todayStats {
            completedTasks
            totalTasks
            completedPomodoros
          }
          estimateFinishTime(input: $input) {
            remainingPomodoros
            basedOnFocusMinutes
          }
        }
      `,
      variables: {
        input: {
          date: '2026-03-20',
          includeBreak: true,
        },
      },
    });

    expect(statsResponse.errors).toBeUndefined();
    expect(statsResponse.data?.todayStats).toEqual({
      completedPomodoros: 1,
      completedTasks: 0,
      totalTasks: 1,
    });
    expect(statsResponse.data?.estimateFinishTime).toEqual({
      basedOnFocusMinutes: 30,
      remainingPomodoros: 1,
    });

    await server.stop();
  });
});
