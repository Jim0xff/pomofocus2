import type { DataSource } from 'typeorm';

import type { RepositoryBundle } from '../../domain/repositories';
import { MemoryRepositoryBundle } from './memory';
import { createTypeOrmRepositoryBundle } from './typeorm';

const sharedMemoryRepositoryBundle = new MemoryRepositoryBundle();

export function createRepositoryBundle(dataSource: DataSource | null | undefined): RepositoryBundle {
  if (dataSource && dataSource.isInitialized) {
    return createTypeOrmRepositoryBundle(dataSource);
  }

  return sharedMemoryRepositoryBundle;
}
