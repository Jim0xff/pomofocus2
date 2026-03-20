try {
  const dotenv = require('dotenv') as { config: () => void };
  dotenv.config();
} catch {
  // Allow limited environments to import config helpers before dependencies are installed.
}

interface RawEnv {
  APP_NAME?: string;
  DATABASE_URL?: string;
  ENABLE_DB_ON_BOOT?: string;
  ENABLE_REDIS_ON_BOOT?: string;
  GRAPHQL_PATH?: string;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
  PORT?: string;
  REDIS_URL?: string;
}

export interface EnvConfig {
  appName: string;
  databaseUrl: string | null;
  enableDbOnBoot: boolean;
  enableRedisOnBoot: boolean;
  graphqlPath: string;
  logLevel: string;
  nodeEnv: string;
  port: number;
  redisUrl: string | null;
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return TRUE_VALUES.has(value.toLowerCase());
}

function parsePort(value: string | undefined): number {
  const fallbackPort = 4000;
  const parsedValue = Number(value ?? fallbackPort);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid PORT value: ${value ?? ''}`);
  }

  return parsedValue;
}

function normalizePath(value: string | undefined): string {
  const path = value?.trim() || '/graphql';

  if (!path.startsWith('/')) {
    throw new Error(`GRAPHQL_PATH must start with "/": ${path}`);
  }

  return path;
}

export function loadEnv(source: RawEnv = process.env): EnvConfig {
  const config: EnvConfig = {
    appName: source.APP_NAME?.trim() || 'pomofocus2-backend',
    databaseUrl: source.DATABASE_URL?.trim() || null,
    enableDbOnBoot: parseBoolean(source.ENABLE_DB_ON_BOOT, false),
    enableRedisOnBoot: parseBoolean(source.ENABLE_REDIS_ON_BOOT, false),
    graphqlPath: normalizePath(source.GRAPHQL_PATH),
    logLevel: source.LOG_LEVEL?.trim() || 'info',
    nodeEnv: source.NODE_ENV?.trim() || 'development',
    port: parsePort(source.PORT),
    redisUrl: source.REDIS_URL?.trim() || null,
  };

  if (config.enableDbOnBoot && !config.databaseUrl) {
    throw new Error('DATABASE_URL is required when ENABLE_DB_ON_BOOT=true');
  }

  if (config.enableRedisOnBoot && !config.redisUrl) {
    throw new Error('REDIS_URL is required when ENABLE_REDIS_ON_BOOT=true');
  }

  return config;
}

export const env = loadEnv();
