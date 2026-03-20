import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error';
import type { AuthenticatedUser } from '../types/auth';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');

  if (!payload) {
    return {};
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildUser(token: string): AuthenticatedUser {
  const claims = decodeJwtPayload(token);
  const subject =
    typeof claims.sub === 'string' && claims.sub.length > 0 ? claims.sub : null;

  return {
    token,
    subject,
    claims,
  };
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

  req.user = buildUser(token);
  next();
};

export function requireAuth(user: AuthenticatedUser | null, requestId: string): void {
  if (user === null) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.', {
      requestId,
    });
  }
}
