import request from 'supertest';

import { createApp, registerFallbackHandlers } from '../src/app';

describe('app scaffold', () => {
  it('returns health metadata with a request id', async () => {
    const app = createApp();
    registerFallbackHandlers(app);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.requestId).toBe('string');
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('returns standardized not found errors', async () => {
    const app = createApp();
    registerFallbackHandlers(app);

    const response = await request(app).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(typeof response.body.requestId).toBe('string');
  });
}
