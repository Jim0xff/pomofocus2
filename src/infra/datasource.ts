import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Registration } from '../models/Registration.js';
import { AdminUser } from '../models/AdminUser.js';
import { AdminSession } from '../models/AdminSession.js';

const entities = [Registration, AdminUser, AdminSession];

function makeDataSource() {
  if ((process.env.DB_TYPE || '').toLowerCase() === 'sqljs') {
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
