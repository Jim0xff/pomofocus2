import { describe, it, expect } from 'vitest';
import { errorHandler } from '../src/middleware/error-handler.js';
import { badRequest } from '../src/infra/errors.js';

function createRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

describe('errorHandler contract', () => {
  it('returns unified error shape with requestId', () => {
    const req: any = { requestId: 'req-1' };
    const res = createRes();

    errorHandler(badRequest('BAD_REQUEST', 'oops', { field: 'size' }), req, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'oops',
      requestId: 'req-1',
    });
  });
});
