import bcrypt from 'bcryptjs';
import { AppDataSource } from '../infra/datasource.js';
import { AdminUser } from '../models/AdminUser.js';

const { hash } = bcrypt;

export async function ensureAdminSeed() {
  const username = String(process.env.ADMIN_USERNAME || 'admin').trim();
  const password = String(process.env.ADMIN_PASSWORD || 'P@ssw0rd!');
  if (!username || !password) return;

  const repo = AppDataSource.getRepository(AdminUser);
  const existing = await repo.findOne({ where: { username } });
  if (existing) return;

  const passwordHash = await hash(password, 10);
  await repo.save(repo.create({
    username,
    passwordHash,
    isActive: true,
  }));
}
