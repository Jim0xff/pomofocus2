import { authMiddleware } from '../../src/middleware/auth';
describe('auth middleware', () => {
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

  it('attaches the decoded subject from a bearer token', () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'user-123' })).toString('base64url');
    const req = createMockRequest({
      authorization: `Bearer header.${payload}.signature`,
    });
    const next = jest.fn();

    authMiddleware(req as never, {} as never, next);

    expect(req.user).toEqual({
      claims: {
        sub: 'user-123',
      },
      subject: 'user-123',
      token: `header.${payload}.signature`,
    });
    expect(next).toHaveBeenCalledWith();
  });
});
