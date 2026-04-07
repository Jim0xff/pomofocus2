import dotenv from 'dotenv';

dotenv.config();

export const PORT = Number(process.env.PORT ?? 4000);
export const ENV = process.env.ENV ?? process.env.NODE_ENV ?? 'local';
export const DATABASE_TYPE = process.env.DATABASE_TYPE ?? (process.env.DATABASE_URL ? 'postgres' : 'sqljs');
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/survey_jim7';
export const DATABASE_CA = process.env.DATABASE_CA;
export const ADMIN_AUTH_TOKEN = process.env.ADMIN_AUTH_TOKEN ?? 'survey-admin-token';
