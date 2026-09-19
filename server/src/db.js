import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.js';
import { seedCategories, seedProjects, seedSettings } from './seed-data.js';

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.VN_DB_PATH || join(here, '..', 'data', 'vibenamune.db');

/** Uploaded logos, screenshots and clips live next to the database file. */
export const UPLOAD_DIR = join(dirname(DB_PATH), 'uploads');

mkdirSync(dirname(DB_PATH), { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

/*
 * Deliberately NOT WAL. WAL keeps a `-wal` and `-shm` file alongside the
 * database, and if the folder is copied to a USB stick — or the stick is pulled
 * — while those exist, the `.db` on its own is missing recent writes. In DELETE
 * mode the journal is removed after every transaction, so whenever the app is
 * idle the single `.db` file is the whole database. Write volume here is a
 * handful of rows per admin action, so the speed difference is not measurable.
 */
db.exec('PRAGMA journal_mode = DELETE');
db.exec('PRAGMA synchronous = FULL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL DEFAULT '',
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'admin',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    title       TEXT    NOT NULL,
    subtitle    TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    intro_title TEXT    NOT NULL DEFAULT '',
    intro_body  TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT 'spark',
    accent      TEXT    NOT NULL DEFAULT 'blue',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    visible     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    subtitle    TEXT    NOT NULL DEFAULT '',
    summary     TEXT    NOT NULL DEFAULT '',
    body        TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT 'spark',
    accent      TEXT    NOT NULL DEFAULT 'blue',
    tags        TEXT    NOT NULL DEFAULT '[]',
    link_url    TEXT    NOT NULL DEFAULT '',
    featured    INTEGER NOT NULL DEFAULT 0,
    published   INTEGER NOT NULL DEFAULT 1,
    views       INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL DEFAULT '',
    subject    TEXT    NOT NULL DEFAULT '',
    body       TEXT    NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS media (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind       TEXT    NOT NULL DEFAULT 'image',
    url        TEXT    NOT NULL,
    caption    TEXT    NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_media_project ON media(project_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
  CREATE INDEX IF NOT EXISTS idx_projects_published ON projects(published, sort_order);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read, created_at);
`);

/**
 * Adds columns that arrived after the first release. Safe to run on every boot:
 * each one is skipped when the table already has it.
 */
function migrate() {
  const addColumn = (table, column, definition) => {
    const has = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  };

  addColumn('projects', 'logo_url', "TEXT NOT NULL DEFAULT ''");
  addColumn('categories', 'cta_label', "TEXT NOT NULL DEFAULT ''");
  addColumn('users', 'created_at', "TEXT NOT NULL DEFAULT ''");
}
migrate();

/** Insert rows only the first time the database is created. */
function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM categories').get();
  if (n > 0) return;

  const insertCat = db.prepare(`
    INSERT INTO categories (slug, title, subtitle, description, intro_title, intro_body, icon, accent, cta_label, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertPrj = db.prepare(`
    INSERT INTO projects (slug, category_id, title, subtitle, summary, body, icon, accent, tags, link_url, featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const catId = new Map();
  seedCategories.forEach((c, i) => {
    const r = insertCat.run(
      c.slug, c.title, c.subtitle, c.description, c.introTitle, c.introBody,
      c.icon, c.accent, c.ctaLabel, i,
    );
    catId.set(c.slug, Number(r.lastInsertRowid));
  });

  seedProjects.forEach((p, i) => {
    insertPrj.run(
      p.slug, catId.get(p.category), p.title, p.subtitle, p.summary, p.body,
      p.icon, p.accent, JSON.stringify(p.tags ?? []), p.linkUrl ?? '',
      p.featured ? 1 : 0, i,
    );
  });
}

function seedSettingsIfMissing() {
  const put = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(seedSettings)) put.run(key, String(value));
}

function seedAdminIfMissing() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;
  const username = process.env.VN_ADMIN_USER || 'Mahdi';
  const password = process.env.VN_ADMIN_PASS || 'MNMZA450M24';
  db.prepare("INSERT INTO users (username, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(username, 'مدیر سایت', hashPassword(password), 'admin');
  console.log(`\n  ▸ حساب مدیر ساخته شد — نام کاربری: ${username} / گذرواژه: ${password}\n`);
}

seedIfEmpty();
seedSettingsIfMissing();
seedAdminIfMissing();

/** Releases the file handle so the folder can be moved straight afterwards. */
export function closeDatabase() {
  try {
    db.close();
  } catch {
    /* already closed, or mid-write — nothing useful left to do */
  }
}

/** Remove expired sessions; called on boot and hourly. */
export function purgeSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}
purgeSessions();

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
