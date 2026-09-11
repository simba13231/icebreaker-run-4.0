// periods.js — Daily Challenge and Weekly Tournament leaderboards. Same
// upsert-best-score-per-player pattern as the main scores table (see
// index.js), just partitioned by day or ISO week instead of all-time.
//
// Table/column names below are always literal strings from this file's own
// callers (never derived from request input), so string-interpolating them
// into SQL is safe — only the bound `?` values ever come from a request.

import { json, validateUsername } from './shared.js';

const MAX_SCORE = 999999;
const MIN_SUBMIT_INTERVAL_MS = 3000;

function isValidDateKey(key) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function isValidWeekKey(key) {
  return /^\d{4}-W\d{2}$/.test(key);
}

async function getPeriodScores(env, table, keyColumn, keyValue, limit) {
  const { results } = await env.DB.prepare(
    `SELECT ${table}.username AS name, ${table}.score, ${table}.created_at
     FROM ${table}
     LEFT JOIN players ON players.username = ${table}.username
     WHERE ${table}.${keyColumn} = ? AND (players.banned IS NULL OR players.banned = 0)
     ORDER BY ${table}.score DESC, ${table}.created_at ASC
     LIMIT ?`
  )
    .bind(keyValue, limit)
    .all();
  return results || [];
}

async function submitPeriodScore(env, table, keyColumn, keyValue, username, score, ip) {
  // Same per-IP throttle pattern as the main leaderboard/codes endpoints.
  const recentColumn = 'created_at';
  const recent = await env.DB.prepare(
    `SELECT ${recentColumn} FROM ${table} WHERE username = ? AND ${keyColumn} = ? ORDER BY ${recentColumn} DESC LIMIT 1`
  )
    .bind(username, keyValue)
    .first();
  if (recent && recent[recentColumn]) {
    const lastMs = new Date(`${recent[recentColumn].replace(' ', 'T')}Z`).getTime();
    if (Number.isFinite(lastMs) && Date.now() - lastMs < MIN_SUBMIT_INTERVAL_MS) {
      return { ok: false, status: 429, error: 'Submitting too fast — try again in a moment.' };
    }
  }

  await env.DB.prepare(
    `INSERT INTO ${table} (username, ${keyColumn}, score) VALUES (?, ?, ?)
     ON CONFLICT(username, ${keyColumn}) DO UPDATE SET
       score = excluded.score, created_at = CURRENT_TIMESTAMP
     WHERE excluded.score > ${table}.score`
  )
    .bind(username, keyValue, score)
    .run();

  return { ok: true };
}

function parseAndValidateScore(body) {
  const score = Number(body.score);
  if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return null;
  }
  return score;
}

// --- Daily -----------------------------------------------------------------------

export async function handleGetDailyScores(url, env) {
  const dateKey = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  if (!isValidDateKey(dateKey)) return json({ error: 'Invalid date.' }, 400);
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 50;

  const scores = await getPeriodScores(env, 'daily_scores', 'date_key', dateKey, limit);
  return json({ dateKey, scores });
}

export async function handlePostDailyScore(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const { name, error } = validateUsername(body.username);
  if (error) return json({ error }, 400);

  const dateKey = typeof body.dateKey === 'string' ? body.dateKey : '';
  if (!isValidDateKey(dateKey)) return json({ error: 'Invalid date.' }, 400);

  const score = parseAndValidateScore(body);
  if (score === null) return json({ error: 'Invalid score.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await submitPeriodScore(env, 'daily_scores', 'date_key', dateKey, name, score, ip);
  if (!result.ok) return json({ error: result.error }, result.status);

  return json({ ok: true });
}

// --- Weekly ------------------------------------------------------------------------

export async function handleGetWeeklyScores(url, env) {
  const weekKey = url.searchParams.get('week');
  const key = weekKey && isValidWeekKey(weekKey) ? weekKey : currentIsoWeekKey();
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 50;

  const scores = await getPeriodScores(env, 'weekly_scores', 'week_key', key, limit);
  return json({ weekKey: key, scores });
}

export async function handlePostWeeklyScore(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const { name, error } = validateUsername(body.username);
  if (error) return json({ error }, 400);

  const weekKey = typeof body.weekKey === 'string' ? body.weekKey : '';
  if (!isValidWeekKey(weekKey)) return json({ error: 'Invalid week.' }, 400);

  const score = parseAndValidateScore(body);
  if (score === null) return json({ error: 'Invalid score.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await submitPeriodScore(env, 'weekly_scores', 'week_key', weekKey, name, score, ip);
  if (!result.ok) return json({ error: result.error }, result.status);

  return json({ ok: true });
}

function currentIsoWeekKey() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
