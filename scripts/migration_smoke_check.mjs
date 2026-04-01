import fs from 'node:fs';
import { newDb } from 'pg-mem';

const db = newDb({ autoCreateForeignKeyIndices: true });

const sql1 = fs.readFileSync(new URL('../migrations/001_create_signups.sql', import.meta.url), 'utf8');
const sql2 = fs.readFileSync(new URL('../migrations/002_create_admin_users.sql', import.meta.url), 'utf8');

const out = {
  up_passed: false,
  down_passed: false,
  details: [],
};

// up
try {
  db.public.none(sql1);
  db.public.none(sql2);
  db.public.one(`SELECT 1 FROM signups LIMIT 1`);
} catch {}

const tableExists = (name) => {
  try {
    return !!db.public.getTable(name);
  } catch {
    return false;
  }
};

const hasSignupsAfterUp = tableExists('signups');
const hasAdminUsersAfterUp = tableExists('admin_users');
out.up_passed = hasSignupsAfterUp && hasAdminUsersAfterUp;
out.details.push(`up: signups=${hasSignupsAfterUp}, admin_users=${hasAdminUsersAfterUp}`);

// down (reverse order)
try {
  db.public.none('DROP TABLE IF EXISTS admin_users;');
  db.public.none('DROP INDEX IF EXISTS idx_signups_created_at;');
  db.public.none('DROP INDEX IF EXISTS idx_signups_email;');
  db.public.none('DROP TABLE IF EXISTS signups;');
} catch (err) {
  out.details.push(`down_error: ${err?.message || err}`);
}

const hasSignupsAfterDown = tableExists('signups');
const hasAdminUsersAfterDown = tableExists('admin_users');
out.down_passed = !hasSignupsAfterDown && !hasAdminUsersAfterDown;
out.details.push(`down: signups=${hasSignupsAfterDown}, admin_users=${hasAdminUsersAfterDown}`);

console.log(JSON.stringify(out, null, 2));
if (!out.up_passed || !out.down_passed) process.exit(1);
