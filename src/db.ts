import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Signup } from './models/Signup.js';
import { config } from './config.js';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  entities: [Signup],
  synchronize: true,
  logging: false,
});
