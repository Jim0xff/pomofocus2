import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { initializeDatabase, getRepository } from './infra/datasource.js';
import { Signup } from './models/signup.js';
import { AdminUser } from './models/admin_user.js';
import {
  ADMIN_JWT_SECRET,
  ADMIN_PASSWORD,
  ADMIN_TOKEN_EXPIRES_IN,
  ADMIN_USERNAME,
  PORT,
} from './infra/constants.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const hashPassword = (input: string) =>
  crypto.createHash('sha256').update(input).digest('hex');

const ok = (res: express.Response, data: any, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: express.Response, code: string, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code, message } });

const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const auth = (req.headers.authorization || '').split(' ');
  if (auth.length !== 2 || auth[0] !== 'Bearer') {
    return fail(res, 'UNAUTHORIZED', 'Missing bearer token', 401);
  }
  try {
    const payload = jwt.verify(auth[1], ADMIN_JWT_SECRET);
    (req as any).admin = payload;
    next();
  } catch {
    return fail(res, 'UNAUTHORIZED', 'Invalid token', 401);
  }
};

app.get('/health', (_req, res) => ok(res, { status: 'ok' }));

app.post('/api/signup', async (req, res) => {
  const { name, team_size, email } = req.body || {};
  if (!name || !email || team_size === undefined) {
    return fail(res, 'INVALID_REQUEST', 'name/team_size/email are required', 400);
  }
  if (!Number.isInteger(team_size) || team_size <= 0) {
    return fail(res, 'VALIDATION_FAILED', 'team_size must be a positive integer', 422);
  }
  if (!/^\S+@\S+\.\S+$/.test(String(email))) {
    return fail(res, 'VALIDATION_FAILED', 'email format invalid', 422);
  }

  const repo = getRepository(Signup);
  const created = await repo.save(
    repo.create({ name: String(name), team_size: Number(team_size), email: String(email) }),
  );

  return ok(
    res,
    {
      id: created.id,
      name: created.name,
      team_size: created.team_size,
      email: created.email,
      created_at: created.created_at,
    },
    201,
  );
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return fail(res, 'INVALID_REQUEST', 'username/password are required', 400);
  }

  const repo = getRepository(AdminUser);
  let admin = await repo.findOne({ where: { username: ADMIN_USERNAME } });
  if (!admin) {
    admin = await repo.save(
      repo.create({ username: ADMIN_USERNAME, password_hash: hashPassword(ADMIN_PASSWORD) }),
    );
  }

  if (String(username) !== admin.username || hashPassword(String(password)) !== admin.password_hash) {
    return fail(res, 'AUTH_FAILED', 'username or password invalid', 401);
  }

  const token = jwt.sign({ username: admin.username }, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_TOKEN_EXPIRES_IN,
  });

  return ok(res, {
    token,
    token_type: 'Bearer',
    expires_in: ADMIN_TOKEN_EXPIRES_IN,
  });
});

app.get('/api/admin/signups', requireAdminAuth, async (_req, res) => {
  return fail(res, 'NOT_IMPLEMENTED', 'Implemented in next phase', 501);
});

await initializeDatabase();
app.listen(Number(PORT), () => {
  console.log(`server ready on ${PORT}`);
});
