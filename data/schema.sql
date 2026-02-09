-- Schema for 7 Minutes with the Lord
-- SQLite compatible

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light',
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_check_in_date TEXT, -- stored as YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS devotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  segments_completed INTEGER NOT NULL DEFAULT 0,
  date_key TEXT NOT NULL, -- YYYY-MM-DD used for streak validation
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_devotions_user_date
ON devotions(user_id, date_key);
