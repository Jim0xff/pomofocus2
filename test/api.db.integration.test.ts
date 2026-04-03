import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createServer } from "../src/api/server.js";
import { appDataSource } from "../src/infra/datasource.js";

const dbReady = Boolean(process.env.DATABASE_URL);

const resetTable = async (): Promise<void> => {
  await appDataSource.query('TRUNCATE TABLE "surveySubmissions"');
};

test("DB integration: submit -> list(desc) -> detail -> not found", { skip: !dbReady }, async () => {
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await resetTable();

  const app = createServer();

  const submitA = await request(app)
    .post("/api/submissions")
    .set("x-request-id", "req_db_1")
    .send({ questionnaire_id: "fixed-survey-v1", answers: { q1: "A", q2: "Answer A" } });
  assert.equal(submitA.status, 201);

  const submitB = await request(app)
    .post("/api/submissions")
    .set("x-request-id", "req_db_2")
    .send({ questionnaire_id: "fixed-survey-v1", answers: { q1: "B", q2: "Answer B" } });
  assert.equal(submitB.status, 201);

  const list = await request(app).get("/api/admin/submissions").set("x-request-id", "req_db_3");
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.data));
  assert.ok(list.body.data.length >= 2);
  assert.equal(list.body.data[0].submitted_at >= list.body.data[1].submitted_at, true);

  const detail = await request(app).get(`/api/admin/submissions/${submitA.body.data.id}`).set("x-request-id", "req_db_4");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.id, submitA.body.data.id);
  assert.equal(detail.body.data.answers.q1, "A");

  const notFound = await request(app).get("/api/admin/submissions/subm_not_exists").set("x-request-id", "req_db_5");
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.code, "SUBMISSION_NOT_FOUND");

  await appDataSource.destroy();
});

test("Concurrency: 20 submissions + unique ids + desc ordering stability", { skip: !dbReady }, async () => {
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await resetTable();

  const app = createServer();

  const submissions = await Promise.all(
    Array.from({ length: 20 }).map((_, idx) =>
      request(app)
        .post("/api/submissions")
        .set("x-request-id", `req_conc_${idx}`)
        .send({ questionnaire_id: "fixed-survey-v1", answers: { q1: `U${idx}`, q2: `Answer ${idx}` } })
    )
  );

  for (const res of submissions) {
    assert.equal(res.status, 201);
  }

  const ids = submissions.map((res) => res.body.data.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 20);

  const list = await request(app).get("/api/admin/submissions").set("x-request-id", "req_conc_list");
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length >= 20);

  for (let i = 1; i < list.body.data.length; i += 1) {
    const prev = list.body.data[i - 1].submitted_at;
    const curr = list.body.data[i].submitted_at;
    assert.equal(prev >= curr, true);
  }

  await appDataSource.destroy();
});

test("Rollback-failure semantics: forced storage failure -> 500 and no half-write", { skip: !dbReady }, async () => {
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await resetTable();

  const app = createServer();
  const beforeCountResult = await appDataSource.query('SELECT COUNT(*)::int AS c FROM "surveySubmissions"');
  const beforeCount = Number(beforeCountResult[0].c);

  const originalGetRepository = appDataSource.getRepository.bind(appDataSource);
  (appDataSource as unknown as { getRepository: (...args: unknown[]) => unknown }).getRepository = (() => ({
    create: (input: unknown) => input,
    save: async () => {
      throw new Error("FORCED_STORAGE_FAILURE");
    }
  })) as (...args: unknown[]) => unknown;

  const failed = await request(app)
    .post("/api/submissions")
    .set("x-request-id", "req_fail_1")
    .send({ questionnaire_id: "fixed-survey-v1", answers: { q1: "X", q2: "Y" } });

  assert.equal(failed.status, 500);
  assert.equal(failed.body.code, "INTERNAL_ERROR");

  (appDataSource as unknown as { getRepository: (...args: unknown[]) => unknown }).getRepository = originalGetRepository as (...args: unknown[]) => unknown;

  const afterCountResult = await appDataSource.query('SELECT COUNT(*)::int AS c FROM "surveySubmissions"');
  const afterCount = Number(afterCountResult[0].c);
  assert.equal(afterCount, beforeCount);

  await appDataSource.destroy();
});
