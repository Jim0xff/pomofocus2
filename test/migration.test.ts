import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compare } from 'bcryptjs';
import { newDb } from 'pg-mem';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function load(file: string) {
  return fs.readFile(path.join(repoRoot, file), 'utf8');
}

describe('migration and seed sql smoke', () => {
  it('runs up + seed + down + up on pg-mem', async () => {
    const db = newDb();

    const m1 = await load('migrations/001_create_registrations.sql');
    const m2 = await load('migrations/002_create_admin_users.sql');
    const m3 = await load('migrations/003_create_admin_sessions.sql');
    const down = await load('migrations/004_rollback_all.sql');
    const s1 = await load('seeds/001_admin_user.sql');

    // up + seed
    db.public.none(m1);
    db.public.none(m2);
    db.public.none(m3);
    db.public.none(s1);

    const admin = db.public.one(`select username, password_hash, is_active from admin_users where username='admin'`);
    expect(admin.username).toBe('admin');
    expect(admin.is_active).toBe(true);
    await expect(compare('P@ssw0rd!', admin.password_hash)).resolves.toBe(true);

    // down
    db.public.none(down);
    const dropped = db.public.one(`select count(*)::int as c from information_schema.tables where table_name='admin_users'`);
    expect(dropped.c).toBe(0);

    // up again (fresh engine to avoid pg-mem serial index recreation bug)
    const db2 = newDb();
    db2.public.none(m1);
    db2.public.none(m2);
    db2.public.none(m3);
    const regTbl = db2.public.one(`select count(*)::int as c from information_schema.tables where table_name='registrations'`);
    expect(regTbl.c).toBeGreaterThan(0);
  });
});
