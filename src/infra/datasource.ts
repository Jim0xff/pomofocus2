import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Registration } from '../models/Registration.js';
import { AdminUser } from '../models/AdminUser.js';
import { AdminSession } from '../models/AdminSession.js';

const entities = [Registration, AdminUser, AdminSession];

function normalizeDatabaseUrl(raw?: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const hit = value.match(/postgres(?:ql)?:\/\/[^\s"']+/i)?.[0] || '';
  if (!hit) return '';

  try {
    const u = new URL(hit);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return hit;
  }
}

function normalizePem(raw?: string) {
  const value = String(raw || '').trim();
  if (!value) return undefined;
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

function makeDataSource() {
  const dbType = (process.env.DB_TYPE || '').toLowerCase();
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const databaseCa = normalizePem(process.env.DATABASE_CA);
  const hasDatabaseUrl = Boolean(databaseUrl);
  const hasPgParts = Boolean(
    process.env.DB_HOST || process.env.DB_PORT || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME,
  );

  if ((!hasDatabaseUrl && dbType === 'sqljs') || (!hasDatabaseUrl && !hasPgParts)) {
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
    url: databaseUrl || undefined,
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hackathon_signup2',
    ssl: {
      rejectUnauthorized: false,
      ...(databaseCa ? { ca: databaseCa } : {}),
    },
    entities,
    synchronize: true,
    logging: false,
  });
}

export const AppDataSource = makeDataSource();
