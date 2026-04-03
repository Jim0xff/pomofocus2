import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSurveySubmissions1712136000000 implements MigrationInterface {
  name = "CreateSurveySubmissions1712136000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "surveySubmissions" (
        "id" varchar(64) PRIMARY KEY,
        "questionnaireId" varchar(64) NOT NULL,
        "answers" jsonb NOT NULL,
        "submittedAt" timestamptz NOT NULL DEFAULT now(),
        "submitterMeta" jsonb NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idxSurveySubmissionsSubmittedAtDesc" ON "surveySubmissions" ("submittedAt" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idxSurveySubmissionsQuestionnaireId" ON "surveySubmissions" ("questionnaireId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idxSurveySubmissionsSubmittedAtDesc"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idxSurveySubmissionsQuestionnaireId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "surveySubmissions"`);
  }
}
