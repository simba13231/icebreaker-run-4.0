// players.js — account registration + progress sync.
//
// There's no password/login here — the leaderboard username itself is the
// account key (see ../README.md for the tradeoffs of that). A "player" row
// is created the first time a device registers a username, seeded from
// whatever that device's local progress already was (so existing players
// don't lose progress when this shipped). After that, the game pulls this
// row down on load (so admin grants/resets actually reach the player) and
// pushes to it at checkpoints (purchases, game over, level complete).

import { json, validateUsername, playerRowToSnapshot } from './shared.js';

const MAX_COINS = 10_000_000;
const MAX_LEVEL = 1000;

function clampCoins(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_COINS, n)) : 0;
}

function sanitizeStringArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((v) => typeof v === 'string' && v.length > 0 && v.length <= 64).slice(0, 500);
  return cleaned.length > 0 ? cleaned : fallback;
}

/** Builds the column values to write from a client-supplied progress object. */
function normalizeProgressInput(body) {
  return {
    coins: clampCoins(body.coins),
    boatsOwned: JSON.stringify(sanitizeStringArray(body.boatsOwned, ['starter'])),
    boatEquipped: typeof body.boatEquipped === 'string' && body.boatEquipped ? body.boatEquipped.slice(0, 64) : 'starter',
    obstaclesOwned: JSON.stringify(sanitizeStringArray(body.obstaclesOwned, ['iceberg'])),
    levelsUnlocked: Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(body.levelsUnlocked)) || 1)),
    levelsCompleted: JSON.stringify(
      sanitizeStringArray((body.levelsCompleted || []).map(String), []).map(Number).filter(Number.isFinite)
    )
  };
}

export async function handleRegister(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const { name, error } = validateUsername(body.username);
  if (error) return json({ error }, 400);

  const initial = normalizeProgressInput(body.initialState || {});

  await env.DB.prepare(
    `INSERT OR IGNORE INTO players
      (username, coins, boats_owned, boat_equipped, obstacles_owned, levels_unlocked, levels_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(name, initial.coins, initial.boatsOwned, initial.boatEquipped, initial.obstaclesOwned, initial.levelsUnlocked, initial.levelsCompleted)
    .run();

  const row = await env.DB.prepare('SELECT * FROM players WHERE username = ?').bind(name).first();
  if (!row) return json({ error: 'Registration failed.' }, 500);

  return json({ ok: true, player: playerRowToSnapshot(row) });
}

export async function handleGetProgress(username, env) {
  const row = await env.DB.prepare('SELECT * FROM players WHERE username = ?').bind(username).first();
  if (!row) return json({ error: 'Player not found.' }, 404);
  return json({ player: playerRowToSnapshot(row) });
}

export async function handlePostProgress(username, request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const values = normalizeProgressInput(body);

  const result = await env.DB.prepare(
    `UPDATE players SET
       coins = ?, boats_owned = ?, boat_equipped = ?, obstacles_owned = ?,
       levels_unlocked = ?, levels_completed = ?, updated_at = CURRENT_TIMESTAMP
     WHERE username = ?`
  )
    .bind(values.coins, values.boatsOwned, values.boatEquipped, values.obstaclesOwned, values.levelsUnlocked, values.levelsCompleted, username)
    .run();

  if (!result.meta || result.meta.changes === 0) {
    return json({ error: 'Player not found.' }, 404);
  }

  return json({ ok: true });
}
