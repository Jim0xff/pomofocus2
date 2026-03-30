import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';

process.env.DB_TYPE = 'sqljs';

const { AppDataSource } = await import('../src/infra/datasource.js');
const { createApp } = await import('../src/app.js');
const { AdminUser } = await import('../src/models/AdminUser.js');

const app = createApp();

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const repo = AppDataSource.getRepository(AdminUser);
  await repo.save(repo.create({ username: 'admin', passwordHash: await hash('P@ssw0rd!', 10), isActive: true }));
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

describe('registration and admin api', () => {
  it('creates registration and prevents duplicate email', async () => {
    const payload = {
      name: 'Alice',
      email: 'alice@example.com',
      teamName: 'Team A',
      projectName: 'HackFlow',
      projectSummary: 'Summary',
      memberCount: 3,
    };

    const first = await request(app).post('/api/v1/registrations').send(payload);
    expect(first.status).toBe(201);
    expect(first.body.code).toBe('CREATED');
    expect(first.body.requestId).toBeTruthy();

    const second = await request(app).post('/api/v1/registrations').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_REGISTERED');
    expect(second.body.requestId).toBeTruthy();
  });

  it('login success/fail and protected list/detail with 404 and desc order', async () => {
    const loginFail = await request(app).post('/api/v1/admin/login').send({ username: 'admin', password: 'wrong' });
    expect(loginFail.status).toBe(401);
    expect(loginFail.body.code).toBe('UNAUTHORIZED');

    await request(app).post('/api/v1/registrations').send({
      name: 'Order1',
      email: 'order1@example.com',
      teamName: 'T1',
      projectName: 'P1',
      projectSummary: 'S1',
      memberCount: 1,
    });
    await request(app).post('/api/v1/registrations').send({
      name: 'Order2',
      email: 'order2@example.com',
      teamName: 'T2',
      projectName: 'P2',
      projectSummary: 'S2',
      memberCount: 1,
    });

    const login = await request(app).post('/api/v1/admin/login').send({ username: 'admin', password: 'P@ssw0rd!' });
    expect(login.status).toBe(200);
    const token = login.body.data.token as string;

    const list401 = await request(app).get('/api/v1/admin/registrations');
    expect(list401.status).toBe(401);

    const list = await request(app)
      .get('/api/v1/admin/registrations?page=1&pageSize=20')
      .set('Authorization', `Bearer ${token}`)
      .set('x-request-id', 'rid-list-001');
    expect(list.status).toBe(200);
    expect(list.body.requestId).toBe('rid-list-001');
    expect(list.body.data.pagination.pageSize).toBe(20);
    expect(list.body.data.items[0].email).toBe('order2@example.com');
    expect(list.body.data.items[1].email).toBe('order1@example.com');

    const id = list.body.data.items[0].id;
    const detail = await request(app)
      .get(`/api/v1/admin/registrations/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(id);

    const notFound = await request(app)
      .get('/api/v1/admin/registrations/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(notFound.status).toBe(404);
    expect(notFound.body.code).toBe('NOT_FOUND');
  });

  it('concurrent duplicate registration: only one success', async () => {
    const payload = {
      name: 'Bob',
      email: 'bob@example.com',
      teamName: 'Team B',
      projectName: 'HackB',
      projectSummary: 'Summary',
      memberCount: 2,
    };

    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => request(app).post('/api/v1/registrations').send(payload))
    );

    const success = results.filter((r) => r.status === 201).length;
    const conflict = results.filter((r) => r.status === 409).length;

    expect(success).toBe(1);
    expect(conflict).toBe(9);
  });
});
