import { AppDataSource } from '../infra/datasource.js';
import { HttpError } from '../infra/HttpError.js';
import { Registration } from '../models/Registration.js';

export type RegistrationCreateInput = {
  name: string;
  email: string;
  teamName: string;
  projectName: string;
  projectSummary: string;
  memberCount: number;
};

const repo = () => AppDataSource.getRepository(Registration);

export async function createRegistration(input: RegistrationCreateInput) {
  const email = input.email.trim().toLowerCase();
  const exists = await repo().findOne({ where: { email } });
  if (exists) {
    throw new HttpError(409, 'ALREADY_REGISTERED', 'email already registered', { email });
  }

  const entity = repo().create({ ...input, email, submittedAt: new Date() });
  try {
    const saved = await repo().save(entity);
    return { registrationId: Number(saved.id), submittedAt: saved.submittedAt.toISOString() };
  } catch (error: any) {
    if (error?.code === '23505') {
      throw new HttpError(409, 'ALREADY_REGISTERED', 'email already registered', { email });
    }
    throw error;
  }
}

export async function listRegistrations(page: number, pageSize: number) {
  const [items, total] = await repo().findAndCount({
    order: { submittedAt: 'DESC' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: items.map((r) => ({
      id: Number(r.id),
      name: r.name,
      email: r.email,
      teamName: r.teamName,
      projectName: r.projectName,
      memberCount: r.memberCount,
      submittedAt: r.submittedAt.toISOString(),
    })),
    pagination: { page, pageSize, total },
  };
}

export async function getRegistrationDetail(id: number) {
  const found = await repo().findOne({ where: { id: String(id) } });
  if (!found) {
    throw new HttpError(404, 'NOT_FOUND', 'registration not found', { id });
  }
  return {
    id: Number(found.id),
    name: found.name,
    email: found.email,
    teamName: found.teamName,
    projectName: found.projectName,
    projectSummary: found.projectSummary,
    memberCount: found.memberCount,
    submittedAt: found.submittedAt.toISOString(),
    createdAt: found.createdAt.toISOString(),
    updatedAt: found.updatedAt.toISOString(),
  };
}
