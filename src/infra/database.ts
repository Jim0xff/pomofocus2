import { DataSource, type DataSourceOptions } from 'typeorm';

import { env } from '../config/env';

export function createDataSourceOptions(
  overrides: Partial<DataSourceOptions> = {},
): DataSourceOptions {
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
