-- 0004_player_banning.sql
-- Adds a banned flag to players. Banned players: hidden from the public
-- leaderboard, blocked from redeeming codes. Everything else (local play,
-- progress sync) is unaffected — banning only affects the two public-facing
-- surfaces, not gameplay itself.

ALTER TABLE players ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_players_banned ON players (banned);
