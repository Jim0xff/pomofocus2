import { gql } from 'apollo-server-express';

import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../types/auth';

export interface GraphQLContext {
  requestId: string;
  user: AuthenticatedUser | null;
}

export const typeDefs = gql`
  type PingResponse {
    message: String!
    requestId: String!
    timestamp: String!
  }

  type Query {
    ping: PingResponse!
  }
`;

export const resolvers = {
  Query: {
    ping: (_parent: unknown, _args: unknown, context: GraphQLContext) => ({
      message: 'Pomofocus2 backend scaffold is running.',
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
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
