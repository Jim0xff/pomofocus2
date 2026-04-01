const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SIGNUP_TABLE_SQL = `
  CREATE TABLE signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signup_type TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    project_name TEXT NOT NULL,
    project_intro TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_signup_type CHECK (signup_type IN ('individual', 'team')),
    CONSTRAINT chk_signup_status CHECK (status IN ('pending', 'approved', 'rejected'))
  );
`;

const EXPECTED_COLUMNS = [
  'id',
  'signup_type',
  'name',
  'email',
  'phone',
  'project_name',
  'project_intro',
  'status',
  'created_at',
  'updated_at',
];

function createDatabaseConnection(filename) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  ensureSignupSchema(db);

  return db;
}

function ensureSignupSchema(db) {
  const tableExists = db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'signups'
    `)
    .get();

  if (!tableExists) {
    db.exec(SIGNUP_TABLE_SQL);
    createSignupIndexes(db);
    return;
  }

  const columns = db.prepare(`PRAGMA table_info(signups)`).all().map((column) => column.name);
  const hasExpectedColumns =
    columns.length === EXPECTED_COLUMNS.length &&
    EXPECTED_COLUMNS.every((columnName) => columns.includes(columnName));

  if (!hasExpectedColumns) {
    rebuildLegacySignupTable(db);
  }

  createSignupIndexes(db);
}

function rebuildLegacySignupTable(db) {
  db.exec(`
    ALTER TABLE signups RENAME TO signups_legacy;
    ${SIGNUP_TABLE_SQL}
    INSERT INTO signups (
      id,
      signup_type,
      name,
      email,
      phone,
      project_name,
      project_intro,
      status,
      created_at,
      updated_at
    )
    SELECT
      id,
      'individual',
      COALESCE(name, ''),
      COALESCE(email, ''),
      '',
      '',
      '',
      CASE
        WHEN status IN ('pending', 'approved', 'rejected') THEN status
        ELSE 'pending'
      END,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(created_at, CURRENT_TIMESTAMP)
    FROM signups_legacy;
    DROP TABLE signups_legacy;
  `);
}

function createSignupIndexes(db) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_signups_created_at
    ON signups (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_signups_status_created_at
    ON signups (status, created_at DESC);
  `);
}

function createSignupRepository(db) {
  const selectSignupColumns = `
    SELECT
      id,
      signup_type AS signupType,
      name,
      email,
      phone,
      project_name AS projectName,
      project_intro AS projectIntro,
      status,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM signups
  `;

  const insertSignup = db.prepare(`
    INSERT INTO signups (
      signup_type,
      name,
      email,
      phone,
      project_name,
      project_intro
    )
    VALUES (
      @signupType,
      @name,
      @email,
      @phone,
      @projectName,
      @projectIntro
    )
  `);

  const selectSignupById = db.prepare(`
    ${selectSignupColumns}
    WHERE id = ?
  `);

  const listSignupsBase = `
    ${selectSignupColumns}
    %WHERE%
    ORDER BY created_at DESC, id DESC
    LIMIT @limit OFFSET @offset
  `;

  const countSignupsBase = `
    SELECT COUNT(*) AS total
    FROM signups
    %WHERE%
  `;

  const updateSignupStatus = db.prepare(`
    UPDATE signups
    SET status = @status, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  return {
    createSignup(input) {
      const result = insertSignup.run(input);
      return selectSignupById.get(result.lastInsertRowid);
    },

    getSignupById(id) {
      return selectSignupById.get(id) || null;
    },

    listSignups({ page, size, status }) {
      const params = {
        limit: size,
        offset: (page - 1) * size,
      };

      let whereClause = '';
      if (status) {
        whereClause = 'WHERE status = @status';
        params.status = status;
      }

      const items = db.prepare(listSignupsBase.replace('%WHERE%', whereClause)).all(params);
      const { total } = db.prepare(countSignupsBase.replace('%WHERE%', whereClause)).get(params);

      return {
        items,
        total,
        page,
        size,
      };
    },

    updateSignupStatus(id, status) {
      const result = updateSignupStatus.run({ id, status });
      if (result.changes === 0) {
        return null;
      }

      return selectSignupById.get(id);
    },
  };
}

module.exports = {
  createDatabaseConnection,
  createSignupRepository,
};
