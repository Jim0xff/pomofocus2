import http from 'node:http';

import { ApolloServer } from 'apollo-server-express';

import { createApp, registerFallbackHandlers } from './app';
import { env } from './config/env';
import { appDataSource } from './infra/database';
import { getRedisClient } from './infra/redis';
import { formatGraphQLError, resolvers, typeDefs, type GraphQLContext } from './graphql/schema';
import { logger } from './shared/logger';

async function initializeInfrastructure(): Promise<void> {
  if (env.enableDbOnBoot && appDataSource !== null && !appDataSource.isInitialized) {
    await appDataSource.initialize();
    logger.info('Database connection initialized');
  }

  const redisClient = getRedisClient();
  if (env.enableRedisOnBoot && redisClient !== null && !redisClient.isOpen) {
    await redisClient.connect();
    logger.info('Redis connection initialized');
  }
}

async function closeInfrastructure(): Promise<void> {
  if (appDataSource !== null && appDataSource.isInitialized) {
    await appDataSource.destroy();
  }

  const redisClient = getRedisClient();
  if (redisClient !== null && redisClient.isOpen) {
    await redisClient.quit();
  }
}

export async function bootstrap(): Promise<http.Server> {
  await initializeInfrastructure();

  const app = createApp();
  const apolloServer = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      requestId: req.requestId,
      user: req.user ?? null,
    }),
    formatError: formatGraphQLError,
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    path: env.graphqlPath,
    cors: true,
  });

  registerFallbackHandlers(app);

  const server = app.listen(env.port, () => {
    logger.info('Pomofocus2 backend listening', {
      graphqlPath: env.graphqlPath,
      port: env.port,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutdown requested', { signal });
    await apolloServer.stop();
    await closeInfrastructure();
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  return server;
}

void bootstrap().catch((error: unknown) => {
  logger.error('Failed to bootstrap application', {
    error:
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : error,
  });

  process.exit(1);
});
