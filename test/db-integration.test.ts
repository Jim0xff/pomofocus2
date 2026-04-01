import { describe, it, expect } from 'vitest';
import { newDb } from 'pg-mem';
import { Signup } from '../src/models/Signup.js';

describe('OBL-03 DB integration evidence', () => {
  it('persists and reads signup records with submittedAt ordering', async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({ name: 'version', returns: 'text' as any, implementation: () => '14.2' });
    db.public.registerFunction({
      name: 'current_database',
      returns: 'text' as any,
      implementation: () => 'pg_mem',
    });

    const ds = await db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [Signup],
      synchronize: true,
    } as any);

    await ds.initialize();
    const repo = ds.getRepository(Signup);

    await repo.save(
      repo.create({
        name: 'Alice',
        email: 'alice@example.com',
        teamSize: 3,
        submittedAt: new Date('2026-04-01T09:00:00.000Z'),
      }),
    );

    await repo.save(
      repo.create({
        name: 'Bob',
        email: 'bob@example.com',
        teamSize: 1,
        submittedAt: new Date('2026-04-01T09:05:00.000Z'),
      }),
    );

    const rows = await repo.find({ order: { submittedAt: 'DESC' } });

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Bob');
    expect(rows[1].name).toBe('Alice');
    expect(rows[0].teamSize).toBe(1);

    await ds.destroy();
  });
});
