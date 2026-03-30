import { Router } from 'express';
import { HttpError } from '../infra/HttpError.js';
import { createRegistration } from '../services/registrationService.js';

export const publicRegistrationsRouter = Router();

publicRegistrationsRouter.post('/registrations', async (req, res, next) => {
  try {
    const payload = validateRegistrationPayload(req.body);
    const data = await createRegistration(payload);
    return res.status(201).json({
      code: 'CREATED',
      message: 'registration submitted',
      data,
      requestId: res.locals.requestId,
    });
  } catch (error) {
    return next(error);
  }
});

function validateRegistrationPayload(body: any) {
  const required = ['name', 'email', 'teamName', 'projectName', 'projectSummary', 'memberCount'];
  for (const f of required) {
    if (body?.[f] === undefined || body?.[f] === null || body?.[f] === '') {
      throw new HttpError(400, 'VALIDATION_ERROR', `${f} is required`, { field: f, reason: 'required' });
    }
  }
  const email = String(body.email).trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'invalid email format', { field: 'email', reason: 'format' });
  }
  const memberCount = Number(body.memberCount);
  if (!Number.isInteger(memberCount) || memberCount <= 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'memberCount must be positive integer', { field: 'memberCount', reason: 'range' });
  }
  const summary = String(body.projectSummary).trim();
  if (summary.length > 2000) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'projectSummary too long', { field: 'projectSummary', reason: 'max_length' });
  }

  return {
    name: String(body.name).trim(),
    email,
    teamName: String(body.teamName).trim(),
    projectName: String(body.projectName).trim(),
    projectSummary: summary,
    memberCount,
  };
}
