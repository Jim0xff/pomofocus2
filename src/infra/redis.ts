import { createClient, type RedisClientType } from 'redis';

import { env } from '../config/env';

let redisClient: RedisClientType | null = null;

export function getRedisClient(): RedisClientType | null {
  if (env.redisUrl === null) {
    return null;
  }

  if (redisClient === null) {
    redisClient = createClient({
      url: env.redisUrl,
    });
  }

  return redisClient;
}
