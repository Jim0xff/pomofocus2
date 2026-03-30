import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Registration } from '../models/Registration.js';
import { AdminUser } from '../models/AdminUser.js';
import { AdminSession } from '../models/AdminSession.js';

const entities = [Registration, AdminUser, AdminSession];

function makeDataSource() {
  const dbType = (process.env.DB_TYPE || '').toLowerCase();
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasPgParts = Boolean(
    process.env.DB_HOST || process.env.DB_PORT || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME,
  );

  if (dbType === 'sqljs' || (!hasDatabaseUrl && !hasPgParts)) {
    return new DataSource({
      type: 'sqljs',
      autoSave: false,
      entities,
      synchronize: true,
      logging: false,
    });
  }

  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hackathon_signup2',
    entities,
    synchronize: false,
    logging: false,
  });
}

export const AppDataSource = makeDataSource();
