export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class InvalidParamsError extends HttpError {
  constructor(message = 'invalid parameters') {
    super(400, 'INVALID_PARAMS', message);
  }
}

export class RequiredAnswerMissingError extends HttpError {
  constructor(questionId: string) {
    super(400, 'REQUIRED_ANSWER_MISSING', `required question ${questionId} is missing`);
  }
}

export class SubmissionNotFoundError extends HttpError {
  constructor() {
    super(404, 'SUBMISSION_NOT_FOUND', 'submission not found');
  }
}

export class UnauthorizedError extends HttpError {
  constructor() {
    super(401, 'UNAUTHORIZED', 'unauthorized');
  }
}
