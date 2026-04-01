import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8080),
  databaseUrl: process.env.DATABASE_URL || '',
  apiBasePath: process.env.API_BASE_PATH || '/api',
};
