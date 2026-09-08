-- 0002_accounts_and_codes.sql
-- Adds player accounts (keyed by username, no password — see README) and
-- redeem codes on top of the original scores-only schema.

CREATE TABLE IF NOT EXISTS players (
  username TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0,
  boats_owned TEXT NOT NULL DEFAULT '["starter"]',
  boat_equipped TEXT NOT NULL DEFAULT 'starter',
  obstacles_owned TEXT NOT NULL DEFAULT '["iceberg"]',
  levels_unlocked INTEGER NOT NULL DEFAULT 1,
  levels_completed TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  item_type TEXT,               -- 'boat' | 'obstacle' | NULL
  item_id TEXT,
  max_uses INTEGER,             -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,              -- NULL = never expires
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS code_redemptions (
  code TEXT NOT NULL,
  username TEXT NOT NULL,
  redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code, username)
);

CREATE INDEX IF NOT EXISTS idx_code_redemptions_username ON code_redemptions (username);
