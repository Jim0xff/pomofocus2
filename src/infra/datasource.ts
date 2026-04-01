import { DataSource } from 'typeorm';
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

  ds = new DataSource({
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
    entities: [Signup, AdminUser],
  });

  return ds;
}

export function initializeDatabase() {
  return getDataSource().initialize();
}
