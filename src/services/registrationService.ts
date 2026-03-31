import { insertRegistration, listRegistrations } from "../repositories/registrationRepository";
import { HttpError } from "../utils/httpError";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string): boolean {
  return /^[0-9+\-\s]{6,20}$/.test(value);
}

export async function createRegistration(input: {
  applicantName?: unknown;
  contactPhoneOrEmail?: unknown;
  projectTrack?: unknown;
  selfIntro?: unknown;
}, registrationDeadlineUtc: string): Promise<{ registrationId: number; createdAt: string }> {
  const applicantName = String(input.applicantName ?? "").trim();
  const contactPhoneOrEmail = String(input.contactPhoneOrEmail ?? "").trim();
  const projectTrack = String(input.projectTrack ?? "").trim();
  const selfIntro = input.selfIntro == null ? undefined : String(input.selfIntro).trim();

  if (!applicantName || !contactPhoneOrEmail || !projectTrack) {
    throw new HttpError(400, "VALIDATION_ERROR", "required fields are missing");
  }

  if (applicantName.length > 100 || projectTrack.length > 120 || (selfIntro && selfIntro.length > 4000)) {
    throw new HttpError(400, "VALIDATION_ERROR", "field length out of range");
  }

  if (!(isEmail(contactPhoneOrEmail) || isPhone(contactPhoneOrEmail))) {
    throw new HttpError(400, "VALIDATION_ERROR", "contactPhoneOrEmail is invalid", {
      field: "contactPhoneOrEmail",
      reason: "invalid_format"
    });
  }

  if (Date.now() > Date.parse(registrationDeadlineUtc)) {
    throw new HttpError(409, "REGISTRATION_CLOSED", "registration is closed", {
      deadlineUtc: registrationDeadlineUtc
    });
  }

  const created = await insertRegistration({ applicantName, contactPhoneOrEmail, projectTrack, selfIntro });
  return { registrationId: created.id, createdAt: created.createdAt };
}

export async function getRegistrationList(page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 && pageSize <= 100 ? Math.floor(pageSize) : 20;

  const result = await listRegistrations(safePage, safePageSize);
  return {
    items: result.items.map((row) => ({
      id: row.id,
      applicantName: row.applicant_name,
      contactPhoneOrEmail: row.contact_phone_or_email,
      projectTrack: row.project_track,
      selfIntro: row.self_intro,
      createdAt: row.created_at
    })),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: result.total
    }
  };
}
