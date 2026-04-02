import { createErrorResponse } from './errors.js';

export const ROUTES = Object.freeze([
  'GET /api/v1/survey',
  'POST /api/v1/responses',
]);

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
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

export function createApp(service) {
  return async function app(request, response) {
    try {
      if (request.method === 'GET' && request.url === '/api/v1/survey') {
        return sendJson(response, 200, {
          success: true,
          data: service.getSurvey(),
        });
      }

      if (request.method === 'POST' && request.url === '/api/v1/responses') {
        const body = await readJsonBody(request);
        return sendJson(response, 201, {
          success: true,
          data: service.submitResponse(body),
        });
      }

      return sendJson(response, 404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          details: null,
          request_id: 'route_not_found',
        },
      });
    } catch (error) {
      const errorResponse = createErrorResponse(error);
      return sendJson(response, errorResponse.statusCode, errorResponse.body);
    }
  };
}
