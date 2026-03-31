import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { newDb } from "pg-mem";
import { readFile } from "fs/promises";
import path from "path";

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";

const db = newDb();
const adapter = db.adapters.createPg();

vi.mock("pg", () => adapter);

const { createApp } = await import("../src/app");
const { getPool } = await import("../src/db/pool");

async function runMigrations() {
  const pool = getPool();
  for (const file of ["001_create_registrations.sql", "002_create_admin_access_tokens.sql"]) {
    const sql = await readFile(path.join(process.cwd(), "migrations", file), "utf8");
    await pool.query(sql);
  }
}

describe("api integration", () => {
  const app = createApp();

  beforeAll(async () => {
    process.env.REGISTRATION_DEADLINE_UTC = "2099-01-01T00:00:00.000Z";
    process.env.ADMIN_INVITE_CODE = "HACK-2026-ADMIN";
    process.env.ADMIN_TOKEN_TTL_SECONDS = "7200";
    await runMigrations();
  });

  beforeEach(async () => {
    const pool = getPool();
    await pool.query("DELETE FROM admin_access_tokens");
    await pool.query("DELETE FROM registrations");
  });

  it("creates registration before deadline", async () => {
    const res = await request(app).post("/api/v1/registrations").send({
      applicantName: "Alice",
      contactPhoneOrEmail: "alice@example.com",
      projectTrack: "AI Agent",
      selfIntro: "hello"
    });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe("CREATED");
    expect(res.body.data.registrationId).toBeTypeOf("number");
  });

  it("rejects invalid required fields", async () => {
    const res = await request(app).post("/api/v1/registrations").send({
      applicantName: "",
      contactPhoneOrEmail: "alice@example.com",
      projectTrack: "AI Agent"
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects after deadline", async () => {
    process.env.REGISTRATION_DEADLINE_UTC = "2000-01-01T00:00:00.000Z";
    const res = await request(app).post("/api/v1/registrations").send({
      applicantName: "Bob",
      contactPhoneOrEmail: "bob@example.com",
      projectTrack: "Web"
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("REGISTRATION_CLOSED");
    process.env.REGISTRATION_DEADLINE_UTC = "2099-01-01T00:00:00.000Z";
  });

  it("verifies invite and accesses list with token", async () => {
    await request(app).post("/api/v1/registrations").send({
      applicantName: "Alice",
      contactPhoneOrEmail: "alice@example.com",
      projectTrack: "AI Agent"
    });

    const invite = await request(app).post("/api/v1/admin/invite/verify").send({ inviteCode: "HACK-2026-ADMIN" });
    expect(invite.status).toBe(200);
    const token = invite.body.data.accessToken as string;

    const list = await request(app)
      .get("/api/v1/admin/registrations?page=1&pageSize=20")
      .set("Authorization", `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBe(1);
  });

  it("rejects invalid invite code", async () => {
    const invite = await request(app).post("/api/v1/admin/invite/verify").send({ inviteCode: "BAD" });
    expect(invite.status).toBe(401);
    expect(invite.body.code).toBe("INVALID_INVITE_CODE");
  });

  it("rejects unauthorized list access", async () => {
    const list = await request(app).get("/api/v1/admin/registrations");
    expect(list.status).toBe(401);
    expect(list.body.code).toBe("UNAUTHORIZED");
  });
});
