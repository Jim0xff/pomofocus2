import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../infra/datasource.js';
import { HttpError } from '../infra/HttpError.js';
import { AdminUser } from '../models/AdminUser.js';
import { AdminSession } from '../models/AdminSession.js';

const { compare } = bcrypt;
const userRepo = () => AppDataSource.getRepository(AdminUser);
const sessionRepo = () => AppDataSource.getRepository(AdminSession);

export async function loginAdmin(username: string, password: string) {
  const user = await userRepo().findOne({ where: { username } });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'UNAUTHORIZED', 'invalid username or password', { reason: 'bad_credentials' });
  }

  const ok = await compare(password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'UNAUTHORIZED', 'invalid username or password', { reason: 'bad_credentials' });
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await sessionRepo().save(sessionRepo().create({
    adminUserId: user.id,
    tokenHash,
    expiresAt,
    revokedAt: null,
  }));

  return {
    token,
    tokenType: 'Bearer',
    expiresAt: expiresAt.toISOString(),
    admin: { id: Number(user.id), username: user.username },
  };
}

export async function verifyToken(token: string) {
  const tokenHash = sha256(token);
  const now = new Date();
  const found = await sessionRepo().findOne({ where: { tokenHash }, relations: { adminUser: true } });
  if (!found || found.revokedAt || found.expiresAt <= now || !found.adminUser?.isActive) {
    throw new HttpError(401, 'UNAUTHORIZED', 'token missing or invalid', { reason: 'token_invalid' });
  }
  return { adminId: Number(found.adminUserId), username: found.adminUser.username };
}

function sha256(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
