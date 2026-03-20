import type { RequestHandler } from 'express';

import { env } from '../config/env';
import { HttpError } from '../errors/http-error';
import type { AuthenticatedUser } from '../types/auth';

function buildDecodeTokenUrl(token?: string): string {
  if (!env.taskPointUrl) {
    throw new HttpError(500, 'AUTH_INTEGRATION_MISCONFIGURED', 'TASK_POINT_URL is not configured.', {
      requestId: undefined,
    });
  }

  const url = new URL('/user/decodeToken', env.taskPointUrl);

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeClaims(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.data)) {
    return normalizeClaims(payload.data);
  }

  if (isRecord(payload.claims)) {
    return payload.claims;
  }

  return payload;
}

function isTemplateEnvelope(
  payload: unknown,
): payload is { code: number; data?: unknown; message?: unknown } {
  return isRecord(payload) && typeof payload.code === 'number';
}

function extractSubject(claims: Record<string, unknown>): string | null {
  const subject =
    typeof claims.subject === 'string' && claims.subject.length > 0
      ? claims.subject
      : typeof claims.sub === 'string' && claims.sub.length > 0
        ? claims.sub
        : null;

  return subject;
}

function buildUser(token: string, payload: unknown): AuthenticatedUser {
  const claims = normalizeClaims(payload);
  const subject = extractSubject(claims);

  return {
    token,
    subject,
    claims,
  };
}

async function decodeToken(
  token: string,
  authorizationHeader: string | undefined,
  requestId: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    traceId: requestId,
    'x-server-call': 'true',
  };

  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }

  const response = await fetch(buildDecodeTokenUrl(token), {
    headers,
    method: 'GET',
  });

  let payload: unknown = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (isTemplateEnvelope(payload)) {
    if (payload.code === 200) {
      return payload.data ?? {};
    }

    if (payload.code === 401) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token', {
        requestId,
      });
    }

    throw new HttpError(502, 'UPSTREAM_AUTH_ERROR', 'Upstream auth request failed.', {
      details: {
        upstreamCode: payload.code,
        upstreamMessage:
          typeof payload.message === 'string' && payload.message.length > 0 ? payload.message : undefined,
        upstreamStatus: response.status,
      },
      requestId,
    });
  }

  if (response.status === 401) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token', {
      requestId,
    });
  }

  if (!response.ok) {
    throw new HttpError(502, 'UPSTREAM_AUTH_ERROR', 'Upstream auth request failed.', {
      details: {
        upstreamStatus: response.status,
      },
      requestId,
    });
  }

  return payload;
}

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const authorizationHeader = req.header('authorization');

  if (!authorizationHeader) {
    req.user = null;
    next();
    return;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    next(
      new HttpError(401, 'INVALID_AUTH_HEADER', 'Authorization header must use Bearer token format.', {
        requestId: req.requestId,
      }),
    );
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    next(
      new HttpError(401, 'UNAUTHORIZED', 'Bearer token is missing.', {
        requestId: req.requestId,
      }),
    );
    return;
  }

  void decodeToken(token, authorizationHeader, req.requestId)
    .then((payload) => {
      req.user = buildUser(token, payload);
      next();
    })
    .catch((error: unknown) => {
      if (error instanceof HttpError) {
        next(
          new HttpError(error.statusCode, error.code, error.message, {
            details: error.details,
            requestId: req.requestId,
          }),
        );
        return;
      }

      next(
        new HttpError(502, 'UPSTREAM_AUTH_ERROR', 'Upstream auth request failed.', {
          cause: error,
          requestId: req.requestId,
        }),
      );
    });
};

export function requireAuth(user: AuthenticatedUser | null, requestId: string): void {
  if (user === null) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.', {
      requestId,
    });
  }
}
