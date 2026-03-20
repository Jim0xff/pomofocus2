import { env } from '../../src/config/env';
import { authMiddleware } from '../../src/middleware/auth';

describe('auth middleware', () => {
  const originalFetch = global.fetch;
  const originalTaskPointUrl = env.taskPointUrl;

  function createMockRequest(headers: Record<string, string> = {}) {
    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return {
      headers: normalizedHeaders,
      requestId: 'req-auth-test',
      user: undefined,
      header(name: string) {
        return normalizedHeaders[name.toLowerCase()];
      },
    };
  }

  beforeEach(() => {
    env.taskPointUrl = 'https://task-point.internal';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    env.taskPointUrl = originalTaskPointUrl;
  });

  it('forwards INVALID_AUTH_HEADER when authorization does not use Bearer format', () => {
    const req = createMockRequest({
      authorization: 'Token abc',
    });
    const next = jest.fn();

    authMiddleware(req as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_AUTH_HEADER',
        message: 'Authorization header must use Bearer token format.',
        requestId: 'req-auth-test',
        statusCode: 401,
      }),
    );
  });

  it('attaches the decoded subject from the upstream decode token API', async () => {
    const req = createMockRequest({
      authorization: 'Bearer upstream-token',
    });
    const next = jest.fn();
    const fetchMock = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        claims: {
          role: 'member',
          sub: 'user-123',
        },
      }),
      ok: true,
      status: 200,
    });

    global.fetch = fetchMock as typeof fetch;

    authMiddleware(req as never, {} as never, next);
    await new Promise(process.nextTick);

    expect(fetchMock).toHaveBeenCalledWith('https://task-point.internal/user/decodeToken', {
      body: JSON.stringify({}),
      headers: {
        Authorization: 'Bearer upstream-token',
        'Content-Type': 'application/json',
        traceId: 'req-auth-test',
        'x-server-call': 'true',
      },
      method: 'POST',
    });

    expect(req.user).toEqual({
      claims: {
        role: 'member',
        sub: 'user-123',
      },
      subject: 'user-123',
      token: 'upstream-token',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('normalizes downstream 401 responses as UNAUTHORIZED Invalid token', async () => {
    const req = createMockRequest({
      authorization: 'Bearer invalid-token',
    });
    const next = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as Response) as typeof fetch;

    authMiddleware(req as never, {} as never, next);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
        requestId: 'req-auth-test',
        statusCode: 401,
      }),
    );
  });

  it('maps downstream non-200 responses to upstream auth errors', async () => {
    const req = createMockRequest({
      authorization: 'Bearer upstream-token',
    });
    const next = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response) as typeof fetch;

    authMiddleware(req as never, {} as never, next);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UPSTREAM_AUTH_ERROR',
        details: {
          upstreamStatus: 503,
        },
        message: 'Upstream auth request failed.',
        requestId: 'req-auth-test',
        statusCode: 502,
      }),
    );
  });

  it('maps downstream exceptions to upstream auth errors', async () => {
    const req = createMockRequest({
      authorization: 'Bearer upstream-token',
    });
    const next = jest.fn();

    global.fetch = jest.fn().mockRejectedValue(new Error('socket hang up')) as typeof fetch;

    authMiddleware(req as never, {} as never, next);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UPSTREAM_AUTH_ERROR',
        message: 'Upstream auth request failed.',
        requestId: 'req-auth-test',
        statusCode: 502,
      }),
    );
  });
});
