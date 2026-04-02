import { randomUUID } from 'node:crypto';

import { AppError, createErrorResponse } from './errors.js';
import { validatePaging } from './validation.js';

export const ROUTES = Object.freeze([
  'GET /api/v1/survey',
  'POST /api/v1/responses',
  'GET /api/v1/admin/responses',
  'GET /api/v1/admin/responses/:response_id',
]);

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function sendSuccess(response, statusCode, data) {
  return sendJson(response, statusCode, {
    success: true,
    data,
  });
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (rawBody.length === 0) {
    return {};
  }

  return JSON.parse(rawBody);
}

function authorizeAdmin(request) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authorization header is required');
  }

  const [scheme, token, ...extra] = authorization.split(' ');
  if (scheme !== 'Bearer' || typeof token !== 'string' || token.length === 0 || extra.length > 0) {
    throw new AppError(
      401,
      'AUTH_INVALID_TOKEN',
      'Authorization header must use Bearer token format',
    );
  }

  const adminToken = process.env.ADMIN_API_TOKEN;
  const readonlyToken = process.env.ADMIN_READONLY_TOKEN;

  if (readonlyToken && token === readonlyToken) {
    throw new AppError(403, 'AUTH_FORBIDDEN', 'Token does not have admin access');
  }

  if (!adminToken || token !== adminToken) {
    throw new AppError(401, 'AUTH_INVALID_TOKEN', 'Bearer token is invalid');
  }
}

export function createApp(service) {
  return async function app(request, response) {
    const requestId = randomUUID();

    try {
      const requestUrl = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && requestUrl.pathname === '/api/v1/survey') {
        return sendSuccess(response, 200, service.getSurvey());
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/v1/responses') {
        const body = await readJsonBody(request);
        return sendSuccess(response, 201, service.submitResponse(body));
      }

      if (requestUrl.pathname.startsWith('/api/v1/admin/')) {
        authorizeAdmin(request);
      }

      if (request.method === 'GET' && requestUrl.pathname === '/api/v1/admin/responses') {
        const paging = validatePaging(requestUrl.searchParams);
        return sendSuccess(response, 200, service.listResponses(paging));
      }

      const responseDetailMatch = requestUrl.pathname.match(/^\/api\/v1\/admin\/responses\/([^/]+)$/);
      if (request.method === 'GET' && responseDetailMatch) {
        return sendSuccess(response, 200, service.getResponseDetail(responseDetailMatch[1]));
      }

      return sendJson(response, 404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          details: null,
          request_id: requestId,
        },
      });
    } catch (error) {
      const errorResponse = createErrorResponse(error, requestId);
      return sendJson(response, errorResponse.statusCode, errorResponse.body);
    }
  };
}
