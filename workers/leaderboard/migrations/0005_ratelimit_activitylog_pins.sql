-- 0005_ratelimit_activitylog_pins.sql

-- Track IP on redemptions so we can rate-limit code-guessing attempts the
-- same way score submission already is.
ALTER TABLE code_redemptions ADD COLUMN ip TEXT;
CREATE INDEX IF NOT EXISTS idx_code_redemptions_ip ON code_redemptions (ip);

-- Admin activity log: every mutating admin action gets a row, so there's a
-- record of what happened and when.
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,       -- e.g. 'grant', 'reset', 'ban', 'unban', 'remove', 'code_create', 'code_delete', 'score_delete'
  target TEXT,                -- username or code affected, when applicable
  detail TEXT,                -- short human-readable summary (JSON-ish, not parsed)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at DESC);

-- Username PIN: since usernames are the account key with no password, a PIN
-- keeps someone else from claiming an existing name on a different device.
-- Nullable/optional so existing accounts (created before this) aren't
-- locked out — see players.js for the exact claim logic.
ALTER TABLE players ADD COLUMN pin_hash TEXT;
