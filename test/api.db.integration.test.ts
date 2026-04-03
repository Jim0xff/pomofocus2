import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createServer } from "../src/api/server.js";
import { appDataSource } from "../src/infra/datasource.js";

const dbReady = Boolean(process.env.DATABASE_URL);

test("DB integration: submit -> list(desc) -> detail -> not found", { skip: !dbReady }, async () => {
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await appDataSource.query('TRUNCATE TABLE "surveySubmissions"');

  const app = createServer();

  const submitA = await request(app)
    .post("/api/submissions")
    .set("x-request-id", "req_db_1")
    .send({
      questionnaire_id: "fixed-survey-v1",
      answers: { q1: "A", q2: "Answer A" }
    });
  assert.equal(submitA.status, 201);

  const submitB = await request(app)
    .post("/api/submissions")
    .set("x-request-id", "req_db_2")
    .send({
      questionnaire_id: "fixed-survey-v1",
      answers: { q1: "B", q2: "Answer B" }
    });
  assert.equal(submitB.status, 201);

  const list = await request(app).get("/api/admin/submissions").set("x-request-id", "req_db_3");
  assert.equal(list.status, 200);
  assert.equal(list.body.code, "OK");
  assert.ok(Array.isArray(list.body.data));
  assert.ok(list.body.data.length >= 2);
  assert.equal(list.body.data[0].submitted_at >= list.body.data[1].submitted_at, true);

  const detail = await request(app)
    .get(`/api/admin/submissions/${submitA.body.data.id}`)
    .set("x-request-id", "req_db_4");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.id, submitA.body.data.id);
  assert.equal(detail.body.data.answers.q1, "A");

  const notFound = await request(app).get("/api/admin/submissions/subm_not_exists").set("x-request-id", "req_db_5");
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.code, "SUBMISSION_NOT_FOUND");

  await appDataSource.destroy();
});
