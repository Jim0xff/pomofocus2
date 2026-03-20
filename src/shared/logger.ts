import { env } from '../config/env';
import { Logger, type LogLevel } from '../infra/logger';

function toLogLevel(value: string): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }

  return 'info';
}

export const logger = new Logger(toLogLevel(env.logLevel), {
  service: env.appName,
});
