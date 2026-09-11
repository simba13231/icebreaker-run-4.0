-- 0006_daily_and_weekly_leaderboards.sql
-- Daily Challenge: one row per (username, date), upserted on a new best for
-- that specific day — mirrors the same "one row per player" pattern as the
-- main scores table (migration 0003), just partitioned by day instead of
-- being all-time.
--
-- Weekly Tournament: same idea, partitioned by ISO week instead of day, fed
-- by regular Endless-mode runs (no separate seeded mode needed for this
-- one — see README).

CREATE TABLE IF NOT EXISTS daily_scores (
  username TEXT NOT NULL,
  date_key TEXT NOT NULL, -- 'YYYY-MM-DD', UTC
  score INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (username, date_key)
);
CREATE INDEX IF NOT EXISTS idx_daily_scores_date_score ON daily_scores (date_key, score DESC);

CREATE TABLE IF NOT EXISTS weekly_scores (
  username TEXT NOT NULL,
  week_key TEXT NOT NULL, -- 'YYYY-Www', ISO week, UTC
  score INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (username, week_key)
);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_week_score ON weekly_scores (week_key, score DESC);
