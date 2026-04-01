import { DataSource } from 'typeorm';
import { newDb, DataType } from 'pg-mem';
import fs from 'node:fs';
import path from 'node:path';
import { DATABASE_URL, DATABASE_CA } from './constants.js';
import { Signup } from '../models/signup.js';
import { AdminUser } from '../models/admin_user.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let ds: DataSource = null;

export function getRepository(name: any) {
  return getDataSource().getRepository(name);
}

export function getDataSource() {
  if (ds) return ds;

  if (process.env.USE_PGMEM === 'true') {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    mem.public.registerFunction({ name: 'version', returns: DataType.text, implementation: () => 'pg-mem' });
    mem.public.registerFunction({ name: 'current_database', returns: DataType.text, implementation: () => 'pgmem' });
    ds = mem.adapters.createTypeormDataSource({
      type: 'postgres',
      synchronize: true,
      logging: process.env.LOG_SQL === 'true',
      entities: [Signup, AdminUser],
    });
    return ds;
  }

  ds = new DataSource({
    type: 'postgres',
    url: DATABASE_URL,
    ssl: DATABASE_CA
      ? {
          rejectUnauthorized: false,
          ca: DATABASE_CA,
        }
      : false,
    synchronize: false,
    logging: process.env.LOG_SQL === 'true',
    entities: [Signup, AdminUser],
  });

  return ds;
}

async function runSqlMigrations(dataSource: DataSource) {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  await dataSource.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((x) => x.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [{ exists }] = await dataSource.query(
      'SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1) AS exists',
      [file],
    );
    if (exists) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await dataSource.query('BEGIN');
    try {
      await dataSource.query(sql);
      await dataSource.query('INSERT INTO schema_migrations(name) VALUES ($1)', [file]);
      await dataSource.query('COMMIT');
    } catch (err) {
      await dataSource.query('ROLLBACK');
      throw err;
    }
  }
}

export async function initializeDatabase() {
  const dataSource = await getDataSource().initialize();
  if (process.env.USE_PGMEM !== 'true') {
    await runSqlMigrations(dataSource);
  }
  return dataSource;
}
