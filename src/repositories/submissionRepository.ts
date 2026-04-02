import { pool } from '../db/pool.js';

export interface SubmissionRecord {
  id: string;
  questionnaire_id: string;
  answers: Record<string, string>;
  submitted_at: string;
  submitter_meta: Record<string, unknown> | null;
}

export class SubmissionRepository {
  async insert(record: Omit<SubmissionRecord, 'submitted_at'>): Promise<SubmissionRecord> {
    const result = await pool.query<SubmissionRecord>(
      `INSERT INTO survey_submissions (id, questionnaire_id, answers, submitter_meta)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       RETURNING id, questionnaire_id, answers, submitted_at, submitter_meta`,
      [record.id, record.questionnaire_id, JSON.stringify(record.answers), JSON.stringify(record.submitter_meta)]
    );
    return result.rows[0];
  }

  async listDesc(): Promise<SubmissionRecord[]> {
    const result = await pool.query<SubmissionRecord>(
      `SELECT id, questionnaire_id, answers, submitted_at, submitter_meta
       FROM survey_submissions
       ORDER BY submitted_at DESC, id DESC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<SubmissionRecord | null> {
    const result = await pool.query<SubmissionRecord>(
      `SELECT id, questionnaire_id, answers, submitted_at, submitter_meta
       FROM survey_submissions
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }
}
