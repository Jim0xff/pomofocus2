export class HttpError extends Error {
  statusCode: number;
  code: number;
  details?: unknown;

  constructor(statusCode: number, code: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class InvalidRequestBodyError extends HttpError {
  constructor(details?: unknown) {
    super(400, 4001001, 'INVALID_REQUEST_BODY', details);
  }
}

export class InvalidQuestionnaireIdError extends HttpError {
  constructor(details?: unknown) {
    super(400, 4001002, 'INVALID_QUESTIONNAIRE_ID', details);
  }
}

export class InvalidAnswersError extends HttpError {
  constructor(details?: unknown) {
    super(400, 4001003, 'INVALID_ANSWERS', details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(details?: unknown) {
    super(401, 4011001, 'UNAUTHORIZED', details);
  }
}

export class SubmissionNotFoundError extends HttpError {
  constructor(details?: unknown) {
    super(404, 4041001, 'SUBMISSION_NOT_FOUND', details);
  }
}

export class InternalServerError extends HttpError {
  constructor(details?: unknown) {
    super(500, 5001000, 'INTERNAL_ERROR', details);
  }
}
