import { AppError, type AppErrorOptions } from './app-error';

export class HttpError extends AppError {
  public constructor(
    statusCode: number,
    code: string,
    message: string,
    options: Omit<AppErrorOptions, 'statusCode'> = {},
  ) {
    super(code, message, {
      ...options,
      statusCode,
    });
  }
}
