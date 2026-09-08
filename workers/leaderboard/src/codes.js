// codes.js — player-facing code redemption.
// Admin creation/management of codes lives in admin.js instead, since that
// needs the admin-secret gate.

import { json, playerRowToSnapshot } from './shared.js';

export async function handleRedeem(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';

  if (!username) return json({ error: 'Missing username.' }, 400);
  if (!code) return json({ error: 'Enter a code.' }, 400);

  const player = await env.DB.prepare('SELECT * FROM players WHERE username = ?').bind(username).first();
  if (!player) return json({ error: 'Player not registered yet — open the game once first.' }, 404);
  if (player.banned) return json({ error: 'This account is banned.' }, 403);

  const codeRow = await env.DB.prepare('SELECT * FROM codes WHERE code = ?').bind(code).first();
  if (!codeRow) return json({ error: 'That code doesn\'t exist.' }, 404);

  if (codeRow.expires_at) {
    const expiresMs = new Date(`${codeRow.expires_at.replace(' ', 'T')}Z`).getTime();
    if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
      return json({ error: 'That code has expired.' }, 400);
    }
  }
  if (codeRow.max_uses !== null && codeRow.used_count >= codeRow.max_uses) {
    return json({ error: 'That code has been fully redeemed.' }, 400);
  }

  const alreadyRedeemed = await env.DB.prepare(
    'SELECT 1 FROM code_redemptions WHERE code = ? AND username = ?'
  )
    .bind(code, username)
    .first();
  if (alreadyRedeemed) return json({ error: "You've already redeemed that code." }, 400);

  // Apply the reward.
  const newCoins = Math.max(0, player.coins + (codeRow.coins_reward || 0));
  let boatsOwned = safeParseArray(player.boats_owned, ['starter']);
  let obstaclesOwned = safeParseArray(player.obstacles_owned, ['iceberg']);
  let itemUnlocked = null;

  if (codeRow.item_type === 'boat' && codeRow.item_id && !boatsOwned.includes(codeRow.item_id)) {
    boatsOwned = [...boatsOwned, codeRow.item_id];
    itemUnlocked = { type: 'boat', id: codeRow.item_id };
  } else if (codeRow.item_type === 'obstacle' && codeRow.item_id && !obstaclesOwned.includes(codeRow.item_id)) {
    obstaclesOwned = [...obstaclesOwned, codeRow.item_id];
    itemUnlocked = { type: 'obstacle', id: codeRow.item_id };
  }

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE players SET coins = ?, boats_owned = ?, obstacles_owned = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?'
    ).bind(newCoins, JSON.stringify(boatsOwned), JSON.stringify(obstaclesOwned), username),
    env.DB.prepare('INSERT INTO code_redemptions (code, username) VALUES (?, ?)').bind(code, username),
    env.DB.prepare('UPDATE codes SET used_count = used_count + 1 WHERE code = ?').bind(code)
  ]);

  const updatedRow = await env.DB.prepare('SELECT * FROM players WHERE username = ?').bind(username).first();

  return json({
    ok: true,
    coinsAwarded: codeRow.coins_reward || 0,
    itemUnlocked,
    player: playerRowToSnapshot(updatedRow)
  });
}

function safeParseArray(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
