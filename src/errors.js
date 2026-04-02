import { randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function createErrorResponse(error, requestId = randomUUID()) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const message =
    error instanceof AppError ? error.message : 'An unexpected error occurred';

  return {
    statusCode,
    body: {
      success: false,
      error: {
        code,
        message,
        details: null,
        request_id: requestId,
      },
    },
  };
}
