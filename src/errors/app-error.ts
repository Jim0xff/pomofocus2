export interface AppErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
  requestId?: string;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;

  public constructor(
    code: string,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}
