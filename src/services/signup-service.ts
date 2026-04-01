import { z } from 'zod';
import { AppDataSource } from '../db.js';
import { Signup } from '../models/Signup.js';
import { badRequest } from '../infra/errors.js';

const submitSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  teamSize: z.number().int().min(1),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export async function submitSignup(input: unknown) {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid signup payload', parsed.error.flatten());
  }

  const repo = AppDataSource.getRepository(Signup);
  const entity = repo.create({
    ...parsed.data,
    submittedAt: new Date(),
  });

  const saved = await repo.save(entity);

  return {
    signupId: saved.id,
    submittedAt: saved.submittedAt.toISOString(),
  };
}

export async function listSignups(query: unknown) {
  const parsed = listQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw badRequest('BAD_REQUEST', 'Invalid query params', parsed.error.flatten());
  }

  const { page, size } = parsed.data;
  const repo = AppDataSource.getRepository(Signup);

  const [items, total] = await repo.findAndCount({
    order: { submittedAt: 'DESC' },
    skip: (page - 1) * size,
    take: size,
  });

  return {
    page,
    size,
    total,
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      teamSize: i.teamSize,
      submittedAt: i.submittedAt.toISOString(),
    })),
  };
}
