import { getPool } from "../db/pool";

export type RegistrationRecord = {
  id: number;
  applicant_name: string;
  contact_phone_or_email: string;
  project_track: string;
  self_intro: string | null;
  created_at: string;
};

export async function insertRegistration(input: {
  applicantName: string;
  contactPhoneOrEmail: string;
  projectTrack: string;
  selfIntro?: string;
}): Promise<{ id: number; createdAt: string }> {
  const pool = getPool();
  const result = await pool.query<{ id: number; created_at: string }>(
    `INSERT INTO registrations (applicant_name, contact_phone_or_email, project_track, self_intro)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [input.applicantName, input.contactPhoneOrEmail, input.projectTrack, input.selfIntro ?? null]
  );

  return {
    id: result.rows[0].id,
    createdAt: result.rows[0].created_at
  };
}

export async function listRegistrations(page: number, pageSize: number): Promise<{ items: RegistrationRecord[]; total: number }> {
  const pool = getPool();
  const offset = (page - 1) * pageSize;

  const [itemsRes, totalRes] = await Promise.all([
    pool.query<RegistrationRecord>(
      `SELECT id, applicant_name, contact_phone_or_email, project_track, self_intro, created_at
       FROM registrations
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    ),
    pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM registrations")
  ]);

  return {
    items: itemsRes.rows,
    total: Number(totalRes.rows[0].count)
  };
}
