import crypto from 'node:crypto';

import { IdempotencyKeyStatus } from '../domain/entities';
import type { RepositoryBundle } from '../domain/repositories';
import { ServiceError } from './service-error';

export interface IdempotencyOperation<TResponse> {
  execute: () => Promise<TResponse>;
  input: unknown;
  key: string;
  operation: string;
}

export interface IdempotencyService {
  run<TResponse>(operation: IdempotencyOperation<TResponse>): Promise<TResponse>;
}

interface RedisSnapshotRecord {
  requestHash: string;
  responseSnapshot?: unknown;
  status: IdempotencyKeyStatus;
}

interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  isOpen?: boolean;
  set(
    key: string,
    value: string,
    options?: {
      EX?: number;
      NX?: boolean;
      XX?: boolean;
    },
  ): Promise<string | null>;
  del(key: string): Promise<number>;
}

export interface DefaultIdempotencyServiceOptions {
  now?: () => Date;
  redisClient?: RedisLikeClient | null;
  repositories?: Pick<RepositoryBundle, 'idempotencyKeys'>;
  strictMode?: boolean;
  ttlSeconds?: number;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify({
      __type: 'Date',
      value: value.toISOString(),
    });
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(objectValue[key])}`)
    .join(',')}}`;
}

function encodeSnapshot(value: unknown): unknown {
  if (value instanceof Date) {
    return {
      __type: 'Date',
      value: value.toISOString(),
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => encodeSnapshot(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        encodeSnapshot(entry),
      ]),
    );
  }

  return value;
}

function decodeSnapshot<TValue>(value: unknown): TValue {
  if (Array.isArray(value)) {
    return value.map((entry) => decodeSnapshot(entry)) as TValue;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if (objectValue.__type === 'Date' && typeof objectValue.value === 'string') {
      return new Date(objectValue.value) as TValue;
    }

    return Object.fromEntries(
      Object.entries(objectValue).map(([key, entry]) => [key, decodeSnapshot(entry)]),
    ) as TValue;
  }

  return value as TValue;
}

function createRequestHash(input: unknown): string {
  return crypto.createHash('sha256').update(stableSerialize(input)).digest('hex');
}

function buildConflictError(
  operation: string,
  key: string,
  conflictType: 'IN_PROGRESS' | 'REQUEST_HASH_MISMATCH',
): ServiceError {
  return new ServiceError('IDEMPOTENCY_CONFLICT', 'idempotency key conflict', {
    details: {
      conflictType,
      idemKey: key,
      operation,
    },
    statusCode: 409,
  });
}

export class DefaultIdempotencyService implements IdempotencyService {
  private readonly now: () => Date;
  private readonly redisClient: RedisLikeClient | null;
  private readonly repositories?: Pick<RepositoryBundle, 'idempotencyKeys'>;
  private readonly strictMode: boolean;
  private readonly ttlSeconds: number;

  public constructor(options: DefaultIdempotencyServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.redisClient = options.redisClient ?? null;
    this.repositories = options.repositories;
    this.strictMode = options.strictMode ?? false;
    this.ttlSeconds = options.ttlSeconds ?? 60 * 60 * 24;
  }

  public async run<TResponse>(operation: IdempotencyOperation<TResponse>): Promise<TResponse> {
    const requestHash = createRequestHash(operation.input);

    if (this.redisClient?.isOpen) {
      return this.runWithRedis(operation, requestHash);
    }

    if (this.strictMode && this.repositories) {
      return this.runWithStrictDb(operation, requestHash);
    }

    return this.runWithMemory(operation, requestHash);
  }

  private async runWithMemory<TResponse>(
    operation: IdempotencyOperation<TResponse>,
    requestHash: string,
  ): Promise<TResponse> {
    if (!this.memoryEntries.has(this.getScopedKey(operation.operation, operation.key))) {
      this.memoryEntries.set(this.getScopedKey(operation.operation, operation.key), {
        requestHash,
        status: IdempotencyKeyStatus.PENDING,
      });
      return this.executeAndStoreMemory(operation, requestHash);
    }

    const existing = this.memoryEntries.get(this.getScopedKey(operation.operation, operation.key));
    if (!existing) {
      return this.executeAndStoreMemory(operation, requestHash);
    }

    return this.resolveExistingRecord(operation, requestHash, existing);
  }

  private async executeAndStoreMemory<TResponse>(
    operation: IdempotencyOperation<TResponse>,
    requestHash: string,
  ): Promise<TResponse> {
    const scopedKey = this.getScopedKey(operation.operation, operation.key);

    try {
      const response = await operation.execute();
      this.memoryEntries.set(scopedKey, {
        requestHash,
        responseSnapshot: encodeSnapshot(response),
        status: IdempotencyKeyStatus.SUCCEEDED,
      });
      return response;
    } catch (error) {
      this.memoryEntries.delete(scopedKey);
      throw error;
    }
  }

  private async runWithRedis<TResponse>(
    operation: IdempotencyOperation<TResponse>,
    requestHash: string,
  ): Promise<TResponse> {
    const client = this.redisClient;
    if (!client) {
      return this.runWithMemory(operation, requestHash);
    }

    const redisKey = this.getScopedKey(operation.operation, operation.key);
    const reserved = await client.set(
      redisKey,
      JSON.stringify({
        requestHash,
        status: IdempotencyKeyStatus.PENDING,
      } satisfies RedisSnapshotRecord),
      {
        EX: this.ttlSeconds,
        NX: true,
      },
    );

    if (reserved === 'OK') {
      try {
        const response = await operation.execute();
        await client.set(
          redisKey,
          JSON.stringify({
            requestHash,
            responseSnapshot: encodeSnapshot(response),
            status: IdempotencyKeyStatus.SUCCEEDED,
          } satisfies RedisSnapshotRecord),
          {
            EX: this.ttlSeconds,
          },
        );
        return response;
      } catch (error) {
        await client.del(redisKey);
        throw error;
      }
    }

    const existing = await client.get(redisKey);
    if (!existing) {
      throw buildConflictError(operation.operation, operation.key, 'IN_PROGRESS');
    }

    return this.resolveExistingRecord(
      operation,
      requestHash,
      JSON.parse(existing) as RedisSnapshotRecord,
    );
  }

  private async runWithStrictDb<TResponse>(
    operation: IdempotencyOperation<TResponse>,
    requestHash: string,
  ): Promise<TResponse> {
    const repositories = this.repositories;
    if (!repositories) {
      return this.runWithMemory(operation, requestHash);
    }

    const entry = repositories.idempotencyKeys.create({
      expiresAt: new Date(this.now().getTime() + this.ttlSeconds * 1000),
      idemKey: operation.key,
      lockOwner: crypto.randomUUID(),
      operation: operation.operation,
      requestHash,
      responseSnapshot: null,
      status: IdempotencyKeyStatus.PENDING,
    });
    const inserted = await repositories.idempotencyKeys.insert(entry);

    if (inserted) {
      try {
        const response = await operation.execute();
        inserted.lockOwner = null;
        inserted.responseSnapshot = encodeSnapshot(response) as Record<string, unknown> | null;
        inserted.status = IdempotencyKeyStatus.SUCCEEDED;
        inserted.expiresAt = new Date(this.now().getTime() + this.ttlSeconds * 1000);
        await repositories.idempotencyKeys.save(inserted);
        return response;
      } catch (error) {
        await repositories.idempotencyKeys.deleteByOperationAndKey(
          operation.operation,
          operation.key,
        );
        throw error;
      }
    }

    const existing = await repositories.idempotencyKeys.findByOperationAndKey(
      operation.operation,
      operation.key,
    );
    if (!existing) {
      throw buildConflictError(operation.operation, operation.key, 'IN_PROGRESS');
    }

    return this.resolveExistingRecord(operation, requestHash, existing);
  }

  private resolveExistingRecord<TResponse>(
    operation: IdempotencyOperation<TResponse>,
    requestHash: string,
    existing: {
      requestHash: string;
      responseSnapshot?: unknown;
      status: IdempotencyKeyStatus;
    },
  ): TResponse {
    if (existing.requestHash !== requestHash) {
      throw buildConflictError(operation.operation, operation.key, 'REQUEST_HASH_MISMATCH');
    }

    if (
      existing.status === IdempotencyKeyStatus.SUCCEEDED &&
      existing.responseSnapshot !== undefined
    ) {
      return decodeSnapshot<TResponse>(existing.responseSnapshot);
    }

    throw buildConflictError(operation.operation, operation.key, 'IN_PROGRESS');
  }

  private getScopedKey(operation: string, key: string): string {
    return `idem:${operation}:${key}`;
  }

  private readonly memoryEntries = new Map<string, RedisSnapshotRecord>();
}
