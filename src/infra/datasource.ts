import { DataSource } from 'typeorm';
import { DATABASE_CA, DATABASE_TYPE, DATABASE_URL } from './constants.js';
import { SurveySubmission } from '../models/survey_submission.js';

let ds: DataSource | null = null;

function buildDataSource(): DataSource {
  if (DATABASE_TYPE === 'postgres') {
    return new DataSource({
      type: 'postgres',
      url: DATABASE_URL,
      ssl: DATABASE_CA
        ? {
            rejectUnauthorized: false,
            ca: DATABASE_CA,
          }
        : false,
      synchronize: true,
      logging: process.env.LOG_SQL === 'true',
      entities: [SurveySubmission],
    });
  }

  return new DataSource({
    type: 'sqljs',
    autoSave: false,
    synchronize: true,
    logging: false,
    entities: [SurveySubmission],
  });
}

export function getDataSource(): DataSource {
  if (!ds) {
    ds = buildDataSource();
  }

  return ds;
}

export function getRepository<T extends object>(entity: new () => T) {
  return getDataSource().getRepository(entity);
}

export async function initializeDatabase(): Promise<DataSource> {
  const dataSource = getDataSource();
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  return dataSource;
}

export async function resetDatabase(): Promise<DataSource> {
  await destroyDatabase();
  return initializeDatabase();
}

export async function destroyDatabase(): Promise<void> {
  if (ds?.isInitialized) {
    await ds.destroy();
  }
  ds = null;
}
