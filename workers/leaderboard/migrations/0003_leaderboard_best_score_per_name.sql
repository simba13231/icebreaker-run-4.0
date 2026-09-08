-- 0003_leaderboard_best_score_per_name.sql
-- Collapses the scores table down to one row per name (keeping each
-- player's best score, and the earliest-achieved row in a tie), then
-- enforces that going forward with a unique index. Paired with the
-- upsert logic in src/index.js, which now updates a player's existing row
-- only when they beat their previous score, instead of inserting a new
-- row on every submission.

DELETE FROM scores
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY score DESC, id ASC) AS rn
    FROM scores
  )
  WHERE rn = 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_name_unique ON scores (name);
