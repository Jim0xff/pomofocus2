import { describe, expect, it, vi } from "vitest";
import { newDb } from "pg-mem";
import { readFile } from "fs/promises";
import path from "path";

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";

const db = newDb();
const adapter = db.adapters.createPg();
vi.mock("pg", () => adapter);

const { getPool } = await import("../src/db/pool");

describe("migration smoke", () => {
  it("applies up and rollback sql", async () => {
    const pool = getPool();
    for (const file of ["001_create_registrations.sql", "002_create_admin_access_tokens.sql"]) {
      const sql = await readFile(path.join(process.cwd(), "migrations", file), "utf8");
      await pool.query(sql);
    }

    const upCheck = await pool.query("SELECT DISTINCT table_name FROM information_schema.tables WHERE table_name IN ('registrations','admin_access_tokens')");
    const upTables = upCheck.rows.map((r) => r.table_name).sort();
    expect(upTables).toEqual(["admin_access_tokens", "registrations"]);

    const rollback = await readFile(path.join(process.cwd(), "migrations", "003_rollback_all.sql"), "utf8");
    await pool.query(rollback);

    const downCheck = await pool.query("SELECT DISTINCT table_name FROM information_schema.tables WHERE table_name IN ('registrations','admin_access_tokens')");
    expect(downCheck.rowCount ?? 0).toBe(0);
  });
});
