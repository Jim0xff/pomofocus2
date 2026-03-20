export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  public constructor(
    private readonly level: LogLevel = 'info',
    private readonly bindings: LogFields = {},
  ) {}

  public child(bindings: LogFields): Logger {
    return new Logger(this.level, {
      ...this.bindings,
      ...bindings,
    });
  }

  public debug(message: string, fields?: LogFields): void {
    this.write('debug', message, fields);
  }

  public info(message: string, fields?: LogFields): void {
    this.write('info', message, fields);
  }

  public warn(message: string, fields?: LogFields): void {
    this.write('warn', message, fields);
  }

  public error(message: string, fields?: LogFields): void {
    this.write('error', message, fields);
  }

  private write(level: LogLevel, message: string, fields: LogFields = {}): void {
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.level]) {
      return;
    }

    const payload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.bindings,
      ...fields,
    };

    const serialized = JSON.stringify(payload);
    if (level === 'error') {
      console.error(serialized);
      return;
    }

    console.log(serialized);
  }
}
