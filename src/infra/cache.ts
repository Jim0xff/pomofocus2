import { Redis } from "ioredis";
import { REDIS_URL } from "./constants.js";
import { logger } from "./logger.js";

const redisClient = new Redis(REDIS_URL);

export async function getCache(key: string, defVal?: string) {
    return (await redisClient.get(key)) || defVal;
}

export function getMultiCache(keys: string[]) {
    return redisClient.mget(keys);
}

const BATCH_SIZE = 1000; // Set this to the desired batch size

export async function keys(pattern: string) {
    return redisClient.keys(pattern);
}

export async function setMultiCache(keys: string[], values: string[]) {
    const multi = redisClient.multi();

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batchKeys = keys.slice(i, i + BATCH_SIZE);
        const batchValues = values.slice(i, i + BATCH_SIZE);

        const keyValues = batchKeys.reduce((acc, key, j) => {
            acc.push(key, batchValues[j]);
            return acc;
        }, [] as string[]);

        multi.mset(keyValues);
    }

    return multi.exec();
}

export async function setCache(key: string, value: string, expireInSeconds?: number) {
    if (expireInSeconds) {
        return redisClient.set(key, value, 'EX', expireInSeconds);
    } else {
        return redisClient.set(key, value);
    }
}

export async function delCache(key: string) {
    return redisClient.del(key);
}

export async function enqueue(key: string, value: any) {
    return redisClient.rpush(key, value);
}

export async function dequeue(key: string, limit: number) {
    const result = [];

    while (result.length < limit) {
        const item = await redisClient.lpop(key);
        if (!item) {
            break;
        }
        result.push(item);
    }

    return result;
}

export function list(key: string, start: number = 0, stop: number = -1) {
    return redisClient.lrange(key, start, stop);
}

export function getListByIndex(key: string, index: number) {
    return redisClient.lindex(key, index);
}

export function len(key: string) {
    return redisClient.llen(key);
}

export async function tryLock(key: string, expireInSeconds: number) {
    const result = await redisClient.set(key, '1', 'EX', expireInSeconds, 'NX');
    return result === 'OK';
}

export async function lock({ key, expireInSeconds, timeout, interval }: LockOptions) {
    if (!timeout) {
        return tryLock(key, expireInSeconds);
    }

    const start = Date.now();
    interval ||= timeout / 20;

    while (Date.now() - start < timeout) {
        const tryLockResult = await tryLock(key, expireInSeconds);
        if (tryLockResult) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    logger.error('lock timeout: %s', key);
    return false;
}

export async function unlock(key: string) {
    return redisClient.del(key);
}

export async function withLock(opts: LockOptions, func: any) {
    const start = Date.now();
    const locked = await lock(opts);

    if (!locked) {
        return { success: false };
    }

    const acquiredTime = Date.now();

    try {
        return { success: true, result: await func() };
    } catch (error) {
        logger.error(error);
        throw error;
    }
    finally {
        await unlock(opts.key);
    }
}

export async function withCache(key: string, expire: number, func: () => Promise<string>) {
    const cached = await getCache(key);
    if (cached) {
        return cached;
    }

    const result = await func();
    await setCache(key, result, expire);

    return result;
}

export async function zincrby(key: string, userId: string, score: number) {
    await redisClient.zincrby(key, score, userId);
}

export async function zrevrange(key: string, start: number ,end: number) {
    return await redisClient.zrevrange(key, start, end, "WITHSCORES");
}



interface LockOptions { key: string, expireInSeconds: number, timeout?: number, interval?: number };
