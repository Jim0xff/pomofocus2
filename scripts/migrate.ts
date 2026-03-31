import { readFile } from "fs/promises";
import path from "path";
import { getPool } from "../src/db/pool";

async function main() {
  const pool = getPool();
  const files = ["001_create_registrations.sql", "002_create_admin_access_tokens.sql"];

  for (const file of files) {
    const sql = await readFile(path.join(process.cwd(), "migrations", file), "utf8");
    await pool.query(sql);
  }

  await pool.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
