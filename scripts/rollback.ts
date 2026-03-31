import { readFile } from "fs/promises";
import path from "path";
import { getPool } from "../src/db/pool";

async function main() {
  const pool = getPool();
  const sql = await readFile(path.join(process.cwd(), "migrations", "003_rollback_all.sql"), "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("rollback applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
