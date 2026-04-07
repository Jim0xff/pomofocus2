import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { randomUUID } from 'node:crypto';
import { asyncLocalStorage } from './infra/auth.js';
import { UnauthorizedError } from './infra/HttpError.js';
import { authMiddleware } from './infra/authMiddleware.js';
import { errorHandler } from './infra/errorHandler.js';
import { initializeDatabase } from './infra/datasource.js';
import { logger, withRequestId } from './infra/logger.js';
import { resolvers } from './resolvers.js';
import { typeDefs } from './schema.js';
import { FIXED_QUESTIONNAIRE } from './services/questionnaire_service.js';
import {
  getSurveySubmissionById,
  listSurveySubmissions,
  submitSurveySubmission,
} from './services/survey_submission_service.js';

export type AppContext = {
  req: unknown;
  requestId: string;
  user?: {
    id: string;
    role: 'admin';
  } | null;
};

function createLoggingPlugin() {
  return {
    async requestDidStart(requestContext: { request: { operationName?: string | null; query?: string | null; variables?: unknown } }) {
      if (requestContext.request.operationName === 'IntrospectionQuery') {
        return;
      }

      logger.info('Query: %s', requestContext.request.query?.replace(/\s+/g, ' ').trim() ?? '');
      logger.info('Variables: %s', JSON.stringify(requestContext.request.variables ?? {}));
    },
  };
}

type ApiEnvelope<T> = {
  code: number;
  message: string;
  requestId: string;
  data: T | null;
  details?: unknown;
};

function getRequestIdFromHeaders(value: unknown): string {
  return typeof value === 'string' && value ? value : 'unknown-request';
}

function toSuccessEnvelope<T>(requestId: string, data: T, message: string): ApiEnvelope<T> {
  return {
    code: 0,
    message,
    requestId,
    data,
  };
}

function requireAdmin(req: express.Request): void {
  if (!(req as express.Request & { user?: AppContext['user'] }).user) {
    throw new UnauthorizedError();
  }
}

function parseOptionalPositiveInteger(value: unknown, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return Number.NaN;
}

export async function createApolloAppServer() {
  await initializeDatabase();

  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer<AppContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), createLoggingPlugin()],
  });

  await server.start();

  app.use((req, res, next) => {
    const requestId = String(req.headers['x-request-id'] ?? randomUUID());
    res.setHeader('x-request-id', requestId);

    withRequestId(requestId, () => {
      asyncLocalStorage.run({ req }, next);
    });
  });
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(authMiddleware);
  app.get('/api/questionnaires/fixed', (req, res) => {
    const requestId = getRequestIdFromHeaders(req.headers['x-request-id']);
    res.json(toSuccessEnvelope(requestId, FIXED_QUESTIONNAIRE, 'ok'));
  });
  app.post('/api/submissions', async (req, res, next) => {
    try {
      const requestId = getRequestIdFromHeaders(req.headers['x-request-id']);
      const data = await submitSurveySubmission(req.body);
      res.status(201).json(toSuccessEnvelope(requestId, data, 'created'));
    } catch (error) {
      next(error);
    }
  });
  app.get('/api/admin/submissions', async (req, res, next) => {
    try {
      requireAdmin(req);
      const requestId = getRequestIdFromHeaders(req.headers['x-request-id']);
      const page = parseOptionalPositiveInteger(req.query.page, 1);
      const pageSize = parseOptionalPositiveInteger(req.query.pageSize, 20);
      const data = await listSurveySubmissions({ page, pageSize });
      res.json(toSuccessEnvelope(requestId, data, 'ok'));
    } catch (error) {
      next(error);
    }
  });
  app.get('/api/admin/submissions/:submissionId', async (req, res, next) => {
    try {
      requireAdmin(req);
      const requestId = getRequestIdFromHeaders(req.headers['x-request-id']);
      const data = await getSurveySubmissionById(req.params.submissionId);
      res.json(toSuccessEnvelope(requestId, data, 'ok'));
    } catch (error) {
      next(error);
    }
  });
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({
        req,
        requestId: String(req.headers['x-request-id'] ?? ''),
        user: (req as { user?: AppContext['user'] }).user ?? null,
      }),
    }) as unknown as express.RequestHandler,
  );
  app.use(errorHandler);

  return { app, httpServer, server };
}

export async function startHttpServer() {
  return createApolloAppServer();
}
