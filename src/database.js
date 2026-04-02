import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const migrationPath = resolve(process.cwd(), 'db/migrations/001_init.sql');

export function createDatabase(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(readFileSync(migrationPath, 'utf8'));
  return database;
}
