// admin.js — everything behind the admin key. Every export here assumes
// the caller has ALREADY checked the request's X-Admin-Key header against
// env.ADMIN_KEY (see the gate in index.js) — these functions don't re-check.

import { json, playerRowToSnapshot } from './shared.js';

const DEFAULT_PROGRESS = {
  coins: 0,
  boats_owned: '["starter"]',
  boat_equipped: 'starter',
  obstacles_owned: '["iceberg"]',
  levels_unlocked: 1,
  levels_completed: '[]'
};

function safeParseArray(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// --- Players -----------------------------------------------------------------

export async function handleAdminListPlayers(url, env) {
  const search = (url.searchParams.get('search') || '').trim();
  const query = search
    ? env.DB.prepare('SELECT * FROM players WHERE username LIKE ? ORDER BY updated_at DESC LIMIT 50').bind(`%${search}%`)
    : env.DB.prepare('SELECT * FROM players ORDER BY updated_at DESC LIMIT 50');

  const { results } = await query.all();
  return json({ players: (results || []).map(playerRowToSnapshot) });
}

export async function handleAdminGrant(username, request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  // Ensure a row exists even if this friend hasn't opened the game yet —
  // the grant will be waiting for them the moment they register.
  await env.DB.prepare(
    `INSERT OR IGNORE INTO players (username, coins, boats_owned, boat_equipped, obstacles_owned, levels_unlocked, levels_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(username, DEFAULT_PROGRESS.coins, DEFAULT_PROGRESS.boats_owned, DEFAULT_PROGRESS.boat_equipped, DEFAULT_PROGRESS.obstacles_owned, DEFAULT_PROGRESS.levels_unlocked, DEFAULT_PROGRESS.levels_completed)
    .run();

  const row = await env.DB.prepare('SELECT * FROM players WHERE username = ?').bind(username).first();

  const coinsToAdd = Number.isFinite(Number(body.coins)) ? Math.floor(Number(body.coins)) : 0;
  const newCoins = Math.max(0, row.coins + coinsToAdd);

  let boatsOwned = safeParseArray(row.boats_owned, ['starter']);
  if (body.boatId && typeof body.boatId === 'string' && !boatsOwned.includes(body.boatId)) {
    boatsOwned = [...boatsOwned, body.boatId];
  }

  let obstaclesOwned = safeParseArray(row.obstacles_owned, ['iceberg']);
  if (body.obstacleId && typeof body.obstacleId === 'string' && !obstaclesOwned.includes(body.obstacleId)) {
    obstaclesOwned = [...obstaclesOwned, body.obstacleId];
  }

  await env.DB.prepare(
    'UPDATE players SET coins = ?, boats_owned = ?, obstacles_owned = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?'
  )
    .bind(newCoins, JSON.stringify(boatsOwned), JSON.stringify(obstaclesOwned), username)
    .run();

  const updated = await env.DB.prepare('SELECT * FROM players WHERE username = ?').bind(username).first();
  return json({ ok: true, player: playerRowToSnapshot(updated) });
}

export async function handleAdminReset(username, request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine for reset — default to clearing scores too.
  }
  const clearScores = body.clearScores !== false;

  const result = await env.DB.prepare(
    `UPDATE players SET
       coins = ?, boats_owned = ?, boat_equipped = ?, obstacles_owned = ?,
       levels_unlocked = ?, levels_completed = ?, updated_at = CURRENT_TIMESTAMP
     WHERE username = ?`
  )
    .bind(DEFAULT_PROGRESS.coins, DEFAULT_PROGRESS.boats_owned, DEFAULT_PROGRESS.boat_equipped, DEFAULT_PROGRESS.obstacles_owned, DEFAULT_PROGRESS.levels_unlocked, DEFAULT_PROGRESS.levels_completed, username)
    .run();

  if (!result.meta || result.meta.changes === 0) {
    return json({ error: 'Player not found.' }, 404);
  }

  if (clearScores) {
    await env.DB.prepare('DELETE FROM scores WHERE name = ?').bind(username).run();
  }

  return json({ ok: true });
}

// --- Ban / unban / remove (danger-gated — see index.js) ------------------------

export async function handleAdminBan(username, env) {
  const result = await env.DB.prepare(
    'UPDATE players SET banned = 1, updated_at = CURRENT_TIMESTAMP WHERE username = ?'
  )
    .bind(username)
    .run();
  if (!result.meta || result.meta.changes === 0) return json({ error: 'Player not found.' }, 404);
  return json({ ok: true });
}

export async function handleAdminUnban(username, env) {
  const result = await env.DB.prepare(
    'UPDATE players SET banned = 0, updated_at = CURRENT_TIMESTAMP WHERE username = ?'
  )
    .bind(username)
    .run();
  if (!result.meta || result.meta.changes === 0) return json({ error: 'Player not found.' }, 404);
  return json({ ok: true });
}

/** Fully deletes the account (unlike reset, which keeps the row but zeroes it). */
export async function handleAdminDeletePlayer(username, env) {
  const result = await env.DB.prepare('DELETE FROM players WHERE username = ?').bind(username).run();
  if (!result.meta || result.meta.changes === 0) return json({ error: 'Player not found.' }, 404);

  // Clean up anything referencing this username so nothing orphaned lingers.
  await env.DB.prepare('DELETE FROM scores WHERE name = ?').bind(username).run();
  await env.DB.prepare('DELETE FROM code_redemptions WHERE username = ?').bind(username).run();

  return json({ ok: true });
}

// --- Leaderboard moderation ---------------------------------------------------

export async function handleAdminListScores(url, env) {
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) ? Math.min(500, Math.max(1, Math.floor(requested))) : 200;

  const { results } = await env.DB.prepare(
    `SELECT scores.id, scores.name, scores.score, scores.created_at,
            COALESCE(players.banned, 0) AS banned
     FROM scores
     LEFT JOIN players ON players.username = scores.name
     ORDER BY scores.score DESC, scores.created_at ASC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return json({ scores: results || [] });
}

export async function handleAdminDeleteScore(id, env) {
  const result = await env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run();
  if (!result.meta || result.meta.changes === 0) {
    return json({ error: 'Score not found.' }, 404);
  }
  return json({ ok: true });
}

// --- Codes ---------------------------------------------------------------------

export async function handleAdminListCodes(env) {
  const { results } = await env.DB.prepare('SELECT * FROM codes ORDER BY created_at DESC').all();
  return json({ codes: results || [] });
}

export async function handleAdminCreateCode(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
    return json({ error: 'Code must be 3-32 characters: letters, numbers, and dashes only.' }, 400);
  }

  const coinsReward = Number.isFinite(Number(body.coinsReward)) ? Math.max(0, Math.floor(Number(body.coinsReward))) : 0;
  const itemType = body.itemType === 'boat' || body.itemType === 'obstacle' ? body.itemType : null;
  const itemId = itemType && typeof body.itemId === 'string' && body.itemId ? body.itemId.slice(0, 64) : null;
  const maxUses = body.maxUses === '' || body.maxUses === null || body.maxUses === undefined
    ? null
    : Math.max(1, Math.floor(Number(body.maxUses)) || 1);
  const expiresAt = typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null;

  try {
    await env.DB.prepare(
      'INSERT INTO codes (code, coins_reward, item_type, item_id, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(code, coinsReward, itemType, itemId, maxUses, expiresAt)
      .run();
  } catch (err) {
    return json({ error: 'A code with that name already exists.' }, 409);
  }

  return json({ ok: true });
}

export async function handleAdminDeleteCode(code, env) {
  const result = await env.DB.prepare('DELETE FROM codes WHERE code = ?').bind(code).run();
  if (!result.meta || result.meta.changes === 0) {
    return json({ error: 'Code not found.' }, 404);
  }
  return json({ ok: true });
}
