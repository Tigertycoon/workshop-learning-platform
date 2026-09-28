import Database from 'better-sqlite3';
import path from 'path';
import fs from 'node:fs';
import { config } from './config';

const DB_PATH = config.databasePath;
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

function getChaptersTableSql(tableName: string, includeIfNotExists = false) {
  const ifNotExists = includeIfNotExists ? ' IF NOT EXISTS' : '';
  return `
  CREATE TABLE${ifNotExists} ${tableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    chapter_order INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'frei' CHECK(type IN ('linear', 'frei', 'wahl', 'inspiration')),
    icon TEXT
  );
`;
}

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =========================================================================
// SCHEMA
// =========================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'kind' CHECK(role IN ('kind', 'admin')),
    group_id INTEGER REFERENCES groups(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  ${getChaptersTableSql('chapters', true)}

  CREATE TABLE IF NOT EXISTS chapter_prerequisites (
    chapter_id INTEGER NOT NULL REFERENCES chapters(id),
    prerequisite_id INTEGER NOT NULL REFERENCES chapters(id),
    is_required INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (chapter_id, prerequisite_id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id),
    title TEXT NOT NULL,
    description TEXT,
    task_order INTEGER NOT NULL DEFAULT 0,
    default_status TEXT NOT NULL DEFAULT 'pflicht' CHECK(default_status IN ('pflicht', 'extra'))
  );

  CREATE TABLE IF NOT EXISTS task_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    media_url TEXT
  );

  CREATE TABLE IF NOT EXISTS task_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    criteria_order INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK(media_type IN ('image', 'gif', 'video')),
    url TEXT NOT NULL,
    caption TEXT
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    PRIMARY KEY (user_id, task_id)
  );

  CREATE TABLE IF NOT EXISTS group_task_overrides (
    group_id INTEGER NOT NULL REFERENCES groups(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    status TEXT NOT NULL CHECK(status IN ('pflicht', 'extra', 'versteckt')),
    PRIMARY KEY (group_id, task_id)
  );

  CREATE TABLE IF NOT EXISTS user_task_overrides (
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    status TEXT NOT NULL CHECK(status IN ('pflicht', 'extra', 'versteckt')),
    PRIMARY KEY (user_id, task_id)
  );
`);

// =========================================================================
// SPIELEPORTAL — Spiele-Katalog (zusammengeführt aus Games/Spieleportal)
// =========================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    build_path TEXT NOT NULL,
    tags TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    sort_order INTEGER DEFAULT 0
  );
`);

// =========================================================================
// SELBSTLERNEN — Aktivitäten, Einreichungen, Spiele-Freischaltung
// =========================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    kind TEXT NOT NULL DEFAULT 'generic' CHECK(kind IN ('generic', 'intro', 'blender', 'jingle')),
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    payload_json TEXT,
    file_url TEXT,
    feedback TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS game_unlocks (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    unlocked_at TEXT DEFAULT (datetime('now')),
    set_by INTEGER REFERENCES users(id)
  );
`);

function migrateChaptersTableIfNeeded() {
  const schema = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'chapters'
  `).get() as { sql: string | null } | undefined;

  if (!schema?.sql || schema.sql.includes("'inspiration'")) {
    return;
  }

  console.log('[DB] Aktualisiere chapters-Schema fuer inspiration-Kapitel...');
  db.pragma('foreign_keys = OFF');

  try {
    db.exec(`
      BEGIN;
      ${getChaptersTableSql('chapters_new')}
      INSERT INTO chapters_new (id, title, description, chapter_order, type, icon)
      SELECT
        id,
        title,
        description,
        chapter_order,
        CASE
          WHEN type IN ('linear', 'frei', 'wahl', 'inspiration') THEN type
          ELSE 'frei'
        END,
        icon
      FROM chapters;
      DROP TABLE chapters;
      ALTER TABLE chapters_new RENAME TO chapters;
      COMMIT;
    `);
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors if the transaction never started.
    }
    throw error;
  } finally {
    db.pragma('foreign_keys = ON');
  }

  const foreignKeyIssues = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyIssues.length > 0) {
    throw new Error(`foreign_key_check failed after chapters migration (${foreignKeyIssues.length})`);
  }
}

migrateChaptersTableIfNeeded();

export default db;
