import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error';
import { taskPointGet } from '../services/task_point_client';
import type { AuthenticatedUser } from '../types/auth';

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

function extractSubject(claims: Record<string, unknown>): string | null {
  if (typeof claims.subject === 'string' && claims.subject.length > 0) {
    return claims.subject;
  }

  if (typeof claims.sub === 'string' && claims.sub.length > 0) {
    return claims.sub;
  }

  if (typeof claims.id === 'string' && claims.id.length > 0) {
    return claims.id;
  }

  if (typeof claims.userId === 'string' && claims.userId.length > 0) {
    return claims.userId;
  }

  if (typeof claims.uid === 'string' && claims.uid.length > 0) {
    return claims.uid;
  }

  if (typeof claims.ethAddress === 'string' && claims.ethAddress.length > 0) {
    return claims.ethAddress.toLowerCase();
  }

  if (isRecord(claims.userInfo)) {
    const userInfoId = claims.userInfo.id;
    if (typeof userInfoId === 'string' && userInfoId.length > 0) {
      return userInfoId;
    }

    const userInfoUserId = claims.userInfo.userId;
    if (typeof userInfoUserId === 'string' && userInfoUserId.length > 0) {
      return userInfoUserId;
    }

    const userInfoEth = claims.userInfo.ethAddress;
    if (typeof userInfoEth === 'string' && userInfoEth.length > 0) {
      return userInfoEth.toLowerCase();
    }
  }

  return null;
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
  return taskPointGet(
    '/user/decodeToken',
    { token },
    null,
    true,
    { requestId, authorizationHeader },
  );
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
