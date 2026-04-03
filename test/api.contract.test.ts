import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createServer } from "../src/api/server.js";

test("GET /api/questionnaires/fixed returns fixed questionnaire contract", async () => {
  const app = createServer();
  const res = await request(app).get("/api/questionnaires/fixed").set("x-request-id", "req_test_1");

  assert.equal(res.status, 200);
  assert.equal(res.body.code, "OK");
  assert.equal(res.body.requestId, "req_test_1");
  assert.equal(res.body.data.id, "fixed-survey-v1");
  assert.ok(Array.isArray(res.body.data.questions));
});

test("POST /api/submissions invalid payload returns INVALID_REQUEST with requestId", async () => {
  const app = createServer();
  const res = await request(app)
    .post("/api/submissions")
    .set("x-request-id", "req_test_2")
    .send({ questionnaire_id: "fixed-survey-v1" });

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "INVALID_REQUEST");
  assert.equal(res.body.requestId, "req_test_2");
});
