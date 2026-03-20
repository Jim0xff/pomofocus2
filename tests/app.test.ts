import { createApp, registerFallbackHandlers } from '../src/app';
import { errorHandler, notFoundHandler } from '../src/middleware/error-handler';
import { requestIdMiddleware } from '../src/middleware/request-id';

describe('app scaffold', () => {
  function createMockRequest(method: string, url: string, headers: Record<string, string> = {}) {
    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return {
      headers: normalizedHeaders,
      method,
      originalUrl: url,
      path: url,
      requestId: undefined,
      user: null,
      header(name: string) {
        return normalizedHeaders[name.toLowerCase()];
      },
    };
  }

  function createMockResponse() {
    return {
      body: undefined as unknown,
      headers: {} as Record<string, string>,
      locals: {} as Record<string, unknown>,
      statusCode: 200,
      getHeader(name: string) {
        return this.headers[name.toLowerCase()];
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
      setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
    };
  }

  function runRequestIdMiddleware(req: ReturnType<typeof createMockRequest>, res: ReturnType<typeof createMockResponse>) {
    requestIdMiddleware(req as never, res as never, jest.fn());
  }

  function getHealthHandler() {
    const app = createApp();
    const healthLayer = (app as any)._router.stack.find(
      (layer: any) => layer.route?.path === '/health',
    );

    return healthLayer.route.stack[0].handle as (req: unknown, res: unknown) => void;
  }

  it('returns health metadata with a request id', () => {
    const req = createMockRequest('GET', '/health');
    const res = createMockResponse();

    runRequestIdMiddleware(req, res);
    getHealthHandler()(req, res);

    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).status).toBe('ok');
    expect(typeof (res.body as Record<string, unknown>).requestId).toBe('string');
    expect(res.headers['x-request-id']).toBe((res.body as Record<string, unknown>).requestId);
  });

  it('returns standardized not found errors', () => {
    const app = createApp();
    registerFallbackHandlers(app);
    const req = createMockRequest('GET', '/missing');
    const res = createMockResponse();
    let forwardedError: unknown;

    runRequestIdMiddleware(req, res);
    notFoundHandler(req as never, res as never, (error?: unknown) => {
      forwardedError = error;
    });
    errorHandler(forwardedError, req as never, res as never, jest.fn());

    expect(app).toBeDefined();
    expect(res.statusCode).toBe(404);
    expect((res.body as Record<string, unknown>).code).toBe('NOT_FOUND');
    expect(typeof (res.body as Record<string, unknown>).requestId).toBe('string');
  });
});
