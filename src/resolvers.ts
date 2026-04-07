import { GraphQLScalarType, Kind } from 'graphql';
import { HttpError, InternalServerError, UnauthorizedError } from './infra/HttpError.js';
import { FIXED_QUESTIONNAIRE } from './services/questionnaire_service.js';
import {
  getSurveySubmissionById,
  listSurveySubmissions,
  submitSurveySubmission,
} from './services/survey_submission_service.js';

type GraphQLContext = {
  requestId: string;
  user?: {
    id: string;
    role: 'admin';
  } | null;
};

type Envelope<T> = {
  requestId: string;
  code: number;
  message: string;
  data: T | null;
  details?: unknown;
};

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  },
});

function getRequestId(ctx: GraphQLContext): string {
  return ctx.requestId || 'unknown-request';
}

function requireAdmin(ctx: GraphQLContext): void {
  if (!ctx.user) {
    throw new UnauthorizedError();
  }
}

function toEnvelope<T>(ctx: GraphQLContext, data: T, message: string): Envelope<T> {
  return {
    requestId: getRequestId(ctx),
    code: 0,
    message,
    data,
  };
}

function toErrorEnvelope(ctx: GraphQLContext, error: unknown): Envelope<null> {
  const resolved = error instanceof HttpError ? error : new InternalServerError();

  return {
    requestId: getRequestId(ctx),
    code: resolved.code,
    message: resolved.message,
    data: null,
    details: resolved.details,
  };
}

function wrap<TArgs extends Record<string, unknown>, TResult>(
  handler: (_: unknown, args: TArgs, ctx: GraphQLContext) => Promise<Envelope<TResult>>,
): (_: unknown, args: TArgs, ctx: GraphQLContext) => Promise<Envelope<TResult | null>> {
  return async (_, args, ctx) => {
    try {
      return await handler(_, args, ctx);
    } catch (error) {
      return toErrorEnvelope(ctx, error);
    }
  };
}

export const resolvers = {
  JSON: jsonScalar,
  Query: {
    fixedQuestionnaire: wrap(async (_, __, ctx) => toEnvelope(ctx, FIXED_QUESTIONNAIRE, 'ok')),
    adminSurveySubmissions: wrap(async (_, args: { page?: number; pageSize?: number }, ctx) => {
      requireAdmin(ctx);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      const data = await listSurveySubmissions({ page, pageSize });
      return toEnvelope(ctx, data, 'ok');
    }),
    adminSurveySubmission: wrap(async (_, args: { submissionId: string }, ctx) => {
      requireAdmin(ctx);
      const data = await getSurveySubmissionById(args.submissionId);
      return toEnvelope(ctx, data, 'ok');
    }),
  },
  Mutation: {
    submitSurveySubmission: wrap(
      async (
        _,
        args: { input: { questionnaireId: string; answers: Array<{ questionId: string; answerText: string }> } },
        ctx,
      ) => {
        const data = await submitSurveySubmission(args.input);
        return toEnvelope(ctx, data, 'created');
      },
    ),
  },
};
