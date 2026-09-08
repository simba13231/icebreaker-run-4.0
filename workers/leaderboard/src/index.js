// index.js — Icebreaker Run backend Worker. Routes:
//
//   Leaderboard (public)
//     GET  /api/scores?limit=50
//     POST /api/scores                 { name, score }
//
//   Accounts (public — no password, username IS the account key; see README)
//     POST /api/players/register       { username, initialState }
//     GET  /api/players/:username/progress
//     POST /api/players/:username/progress   { coins, boatsOwned, ... }
//
//   Codes (public redeem, admin-gated management)
//     POST /api/codes/redeem           { username, code }
//
//   Admin (all require header X-Admin-Key: <ADMIN_KEY secret>)
//     GET    /api/admin/players?search=
//     POST   /api/admin/players/:username/grant   { coins?, boatId?, obstacleId? }
//     POST   /api/admin/players/:username/reset   { clearScores? }
//     GET    /api/admin/leaderboard?limit=
//     DELETE /api/admin/leaderboard/:id
//     GET    /api/admin/codes
//     POST   /api/admin/codes          { code, coinsReward, itemType, itemId, maxUses, expiresAt }
//     DELETE /api/admin/codes/:code
//
// Backed by a D1 database (binding: DB). See schema.sql + migrations/ for
// the table definitions and README.md for setup/deploy steps.

import { json, corsHeaders, validateUsername } from './shared.js';
import { handleRegister, handleGetProgress, handlePostProgress } from './players.js';
import { handleRedeem } from './codes.js';
import {
  handleAdminListPlayers,
  handleAdminGrant,
  handleAdminReset,
  handleAdminBan,
  handleAdminUnban,
  handleAdminDeletePlayer,
  handleAdminListScores,
  handleAdminDeleteScore,
  handleAdminListCodes,
  handleAdminCreateCode,
  handleAdminDeleteCode
} from './admin.js';

const MAX_SCORE = 999999;
const MIN_SUBMIT_INTERVAL_MS = 3000; // simple per-IP throttle against spam submissions

async function handleGetScores(url, env) {
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 50;

  // Left-join players so banned accounts' scores are excluded from the
  // public leaderboard. A missing player row (shouldn't normally happen,
  // but the scores table predates accounts) is treated as not-banned so
  // older entries aren't accidentally hidden.
  const { results } = await env.DB.prepare(
    `SELECT scores.name, scores.score, scores.created_at
     FROM scores
     LEFT JOIN players ON players.username = scores.name
     WHERE players.banned IS NULL OR players.banned = 0
     ORDER BY scores.score DESC, scores.created_at ASC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return json({ scores: results || [] });
}

async function handlePostScore(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const { name, error } = validateUsername(body.name);
  if (error) return json({ error }, 400);

  const score = Number(body.score);
  if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: 'Invalid score.' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Basic anti-spam: reject if this IP submitted a score very recently.
  const recent = await env.DB.prepare(
    'SELECT created_at FROM scores WHERE ip = ? ORDER BY created_at DESC LIMIT 1'
  )
    .bind(ip)
    .first();

  if (recent && recent.created_at) {
    const lastMs = new Date(`${recent.created_at.replace(' ', 'T')}Z`).getTime();
    if (Number.isFinite(lastMs) && Date.now() - lastMs < MIN_SUBMIT_INTERVAL_MS) {
      return json({ error: 'Submitting too fast — try again in a moment.' }, 429);
    }
  }

  await env.DB.prepare(
    `INSERT INTO scores (name, score, ip) VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       score = excluded.score,
       ip = excluded.ip,
       created_at = CURRENT_TIMESTAMP
     WHERE excluded.score > scores.score`
  )
    .bind(name, score, ip)
    .run();

  // Read back whatever is actually stored now — if this submission wasn't a
  // personal best, that's still the player's previous (higher) score, not
  // the one they just submitted.
  const stored = await env.DB.prepare('SELECT score FROM scores WHERE name = ?').bind(name).first();
  const storedScore = stored ? stored.score : score;

  const higher = await env.DB.prepare('SELECT COUNT(*) AS higherCount FROM scores WHERE score > ?')
    .bind(storedScore)
    .first();
  const rank = (higher ? higher.higherCount : 0) + 1;

  return json({ ok: true, rank, score: storedScore, isNewRecord: storedScore === score });
}

function isAdminAuthorized(request, env) {
  const key = request.headers.get('X-Admin-Key') || '';
  return Boolean(env.ADMIN_KEY) && key === env.ADMIN_KEY;
}

/**
 * Second, separate secret required in addition to the admin key for the
 * genuinely irreversible actions (ban/unban/full account deletion) — so
 * having the regular admin key alone isn't enough to do those.
 */
function isDangerAuthorized(request, env) {
  const key = request.headers.get('X-Danger-Key') || '';
  return Boolean(env.DANGER_KEY) && key === env.DANGER_KEY;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // --- Public: leaderboard ---------------------------------------------
    if (path === '/api/scores' && request.method === 'GET') return handleGetScores(url, env);
    if (path === '/api/scores' && request.method === 'POST') return handlePostScore(request, env);

    // --- Public: accounts --------------------------------------------------
    if (path === '/api/players/register' && request.method === 'POST') return handleRegister(request, env);

    const progressMatch = path.match(/^\/api\/players\/([^/]+)\/progress$/);
    if (progressMatch && request.method === 'GET') return handleGetProgress(decodeURIComponent(progressMatch[1]), env);
    if (progressMatch && request.method === 'POST') return handlePostProgress(decodeURIComponent(progressMatch[1]), request, env);

    // --- Public: code redemption --------------------------------------------
    if (path === '/api/codes/redeem' && request.method === 'POST') return handleRedeem(request, env);

    // --- Admin (everything below requires X-Admin-Key) ---------------------
    if (path.startsWith('/api/admin/')) {
      if (!isAdminAuthorized(request, env)) return json({ error: 'Unauthorized.' }, 401);

      if (path === '/api/admin/players' && request.method === 'GET') return handleAdminListPlayers(url, env);

      const grantMatch = path.match(/^\/api\/admin\/players\/([^/]+)\/grant$/);
      if (grantMatch && request.method === 'POST') return handleAdminGrant(decodeURIComponent(grantMatch[1]), request, env);

      const resetMatch = path.match(/^\/api\/admin\/players\/([^/]+)\/reset$/);
      if (resetMatch && request.method === 'POST') return handleAdminReset(decodeURIComponent(resetMatch[1]), request, env);

      // --- Danger-gated: ban / unban / full account removal -----------------
      const banMatch = path.match(/^\/api\/admin\/players\/([^/]+)\/ban$/);
      const unbanMatch = path.match(/^\/api\/admin\/players\/([^/]+)\/unban$/);
      const deletePlayerMatch = path.match(/^\/api\/admin\/players\/([^/]+)$/);

      if ((banMatch || unbanMatch || (deletePlayerMatch && request.method === 'DELETE')) && !isDangerAuthorized(request, env)) {
        return json({ error: 'Incorrect danger key.' }, 403);
      }
      if (banMatch && request.method === 'POST') return handleAdminBan(decodeURIComponent(banMatch[1]), env);
      if (unbanMatch && request.method === 'POST') return handleAdminUnban(decodeURIComponent(unbanMatch[1]), env);
      if (deletePlayerMatch && request.method === 'DELETE') return handleAdminDeletePlayer(decodeURIComponent(deletePlayerMatch[1]), env);

      if (path === '/api/admin/leaderboard' && request.method === 'GET') return handleAdminListScores(url, env);

      const deleteScoreMatch = path.match(/^\/api\/admin\/leaderboard\/(\d+)$/);
      if (deleteScoreMatch && request.method === 'DELETE') return handleAdminDeleteScore(Number(deleteScoreMatch[1]), env);

      if (path === '/api/admin/codes' && request.method === 'GET') return handleAdminListCodes(env);
      if (path === '/api/admin/codes' && request.method === 'POST') return handleAdminCreateCode(request, env);

      const deleteCodeMatch = path.match(/^\/api\/admin\/codes\/([^/]+)$/);
      if (deleteCodeMatch && request.method === 'DELETE') return handleAdminDeleteCode(decodeURIComponent(deleteCodeMatch[1]), env);

      return json({ error: 'Not found.' }, 404);
    }

    return json({ error: 'Not found.' }, 404);
  }
};
