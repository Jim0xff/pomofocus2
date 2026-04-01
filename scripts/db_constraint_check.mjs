process.env.USE_PGMEM = 'true';

const { initializeDatabase, getDataSource } = await import('../dist/infra/datasource.js');

await initializeDatabase();
const ds = getDataSource();

const result = {
  team_size_check_enforced: false,
  admin_username_unique_enforced: false,
  details: [],
};

try {
  await ds.query(`INSERT INTO signups(name, team_size, email) VALUES ('bad', 0, 'bad@example.com')`);
  result.details.push('team_size check: insert unexpectedly succeeded');
} catch (err) {
  result.team_size_check_enforced = true;
  result.details.push(`team_size check: blocked (${err?.message || err})`);
}

try {
  await ds.query(`INSERT INTO admin_users(username, password_hash) VALUES ('admin_u', 'x')`);
  await ds.query(`INSERT INTO admin_users(username, password_hash) VALUES ('admin_u', 'y')`);
  result.details.push('admin username unique: duplicate unexpectedly succeeded');
} catch (err) {
  result.admin_username_unique_enforced = true;
  result.details.push(`admin username unique: blocked (${err?.message || err})`);
}

console.log(JSON.stringify(result, null, 2));
await ds.destroy();

if (!result.team_size_check_enforced || !result.admin_username_unique_enforced) {
  process.exit(1);
}
