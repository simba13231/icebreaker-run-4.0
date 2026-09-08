CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_ip_created ON scores (ip, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_name_unique ON scores (name);

-- NOTE: players/codes/code_redemptions tables and the players.banned column
-- are added by migrations/0002_accounts_and_codes.sql and
-- migrations/0004_player_banning.sql — run those after this file on a
-- fresh database.
