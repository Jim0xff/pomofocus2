import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { env } from '../config/env';

export function createDataSourceOptions(
  overrides: Partial<PostgresConnectionOptions> = {},
): PostgresConnectionOptions {
  return {
    type: 'postgres',
    url: env.databaseUrl ?? undefined,
    synchronize: false,
    logging: env.nodeEnv === 'development',
    entities: [],
    migrations: [],
    subscribers: [],
    ...overrides,
  };
}

export const appDataSource =
  env.databaseUrl === null ? null : new DataSource(createDataSourceOptions());
