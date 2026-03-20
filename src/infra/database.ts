import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { env } from '../config/env';
import { DOMAIN_ENTITIES } from '../domain/entities';
import { DOMAIN_MIGRATIONS } from '../domain/migrations';

export function createDataSourceOptions(
  overrides: Partial<PostgresConnectionOptions> = {},
): PostgresConnectionOptions {
  return {
    type: 'postgres',
    url: env.databaseUrl ?? undefined,
    synchronize: false,
    logging: env.nodeEnv === 'development',
    entities: [...DOMAIN_ENTITIES],
    migrations: [...DOMAIN_MIGRATIONS],
    subscribers: [],
    ...overrides,
  };
}

export const appDataSource =
  env.databaseUrl === null ? null : new DataSource(createDataSourceOptions());
