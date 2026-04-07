import { Pool } from 'pg';
import { FIXED_QUESTIONNAIRE_ID, type SurveyAnswer, type SurveySubmission } from '../survey_store.js';

type DbRow = {
  responseid: string;
  questionnaireid: string;
  submittedat: string;
};

type AnswerRow = {
  responseid: string;
  questionid: string;
  value: string;
};

export class SubmissionRepository {
  private pool: Pool | null = null;
  private readonly inMemory: SurveySubmission[] = [];

  constructor(private readonly databaseUrl?: string) {
    if (databaseUrl) {
      const useSsl = databaseUrl.includes('sslmode=require');
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      });
    }
  }

  async init(): Promise<void> {
    if (!this.pool) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "surveyResponse" (
        id BIGSERIAL PRIMARY KEY,
        "responseId" VARCHAR(64) NOT NULL UNIQUE,
        "questionnaireId" VARCHAR(64) NOT NULL,
        "submittedAt" TIMESTAMPTZ NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "surveyResponseAnswer" (
        id BIGSERIAL PRIMARY KEY,
        "responseId" VARCHAR(64) NOT NULL,
        "questionId" VARCHAR(64) NOT NULL,
        value TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uqSurveyResponseAnswerResponseQuestion" UNIQUE("responseId", "questionId"),
        CONSTRAINT "fkSurveyResponseAnswerResponseId" FOREIGN KEY("responseId") REFERENCES "surveyResponse"("responseId")
      );
    `);

    await this.pool.query(`CREATE INDEX IF NOT EXISTS "idxSurveyResponseSubmittedAt" ON "surveyResponse"("submittedAt" DESC);`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS "idxSurveyResponseQuestionnaireSubmittedAt" ON "surveyResponse"("questionnaireId", "submittedAt" DESC);`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS "idxSurveyResponseAnswerResponseId" ON "surveyResponseAnswer"("responseId");`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS "idxSurveyResponseAnswerQuestionId" ON "surveyResponseAnswer"("questionId");`);
  }

  async addSubmission(responseId: string, submittedAt: string, answers: SurveyAnswer[]): Promise<SurveySubmission> {
    if (!this.pool) {
      const item: SurveySubmission = {
        responseId,
        questionnaireId: FIXED_QUESTIONNAIRE_ID,
        submittedAt,
        answers,
      };
      this.inMemory.push(item);
      return item;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "surveyResponse"("responseId", "questionnaireId", "submittedAt", status) VALUES($1,$2,$3,$4)`,
        [responseId, FIXED_QUESTIONNAIRE_ID, submittedAt, 'active']
      );
      for (const answer of answers) {
        await client.query(
          `INSERT INTO "surveyResponseAnswer"("responseId", "questionId", value) VALUES($1,$2,$3)`,
          [responseId, answer.questionId, answer.value]
        );
      }
      await client.query('COMMIT');
      return {
        responseId,
        questionnaireId: FIXED_QUESTIONNAIRE_ID,
        submittedAt,
        answers,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listSubmissions(): Promise<SurveySubmission[]> {
    if (!this.pool) {
      return [...this.inMemory].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    }

    const rows = await this.pool.query<DbRow>(
      `SELECT "responseId", "questionnaireId", "submittedAt" FROM "surveyResponse" ORDER BY "submittedAt" DESC`
    );

    return rows.rows.map((r) => ({
      responseId: r.responseid,
      questionnaireId: r.questionnaireid,
      submittedAt: new Date(r.submittedat).toISOString(),
      answers: [],
    }));
  }

  async getSubmission(responseId: string): Promise<SurveySubmission | undefined> {
    if (!this.pool) {
      return this.inMemory.find((s) => s.responseId === responseId);
    }

    const main = await this.pool.query<DbRow>(
      `SELECT "responseId", "questionnaireId", "submittedAt" FROM "surveyResponse" WHERE "responseId" = $1 LIMIT 1`,
      [responseId]
    );
    if (!main.rows.length) return undefined;

    const answers = await this.pool.query<AnswerRow>(
      `SELECT "responseId", "questionId", value FROM "surveyResponseAnswer" WHERE "responseId" = $1 ORDER BY id ASC`,
      [responseId]
    );

    return {
      responseId: main.rows[0].responseid,
      questionnaireId: main.rows[0].questionnaireid,
      submittedAt: new Date(main.rows[0].submittedat).toISOString(),
      answers: answers.rows.map((a) => ({ questionId: a.questionid, value: a.value })),
    };
  }
}
