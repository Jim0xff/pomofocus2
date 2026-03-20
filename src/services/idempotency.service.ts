export interface IdempotencyOperation<TResponse> {
  execute: () => Promise<TResponse>;
  input: unknown;
  key: string;
  operation: string;
}

export interface IdempotencyService {
  run<TResponse>(operation: IdempotencyOperation<TResponse>): Promise<TResponse>;
}

export class PassthroughIdempotencyService implements IdempotencyService {
  public async run<TResponse>(operation: IdempotencyOperation<TResponse>): Promise<TResponse> {
    void operation.input;
    void operation.key;
    void operation.operation;

    // Phase 4 will replace this with Redis/DB-backed dedupe and replay handling.
    return operation.execute();
  }
}
