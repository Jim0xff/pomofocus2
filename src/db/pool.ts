import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing required env: DATABASE_URL");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
