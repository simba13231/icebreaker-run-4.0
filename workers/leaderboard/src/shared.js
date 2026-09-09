// shared.js — small helpers used across every route handler: CORS/JSON
// response helpers, and username validation shared between score
// submission and account registration.

import { containsProfanity } from './profanity-list.js';

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 16;
export const NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, X-Danger-Key'
  };
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

/** Returns a cleaned name + error string (or null if valid). Doesn't throw. */
export function validateUsername(raw) {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    return { name, error: `Name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters.` };
  }
  if (!NAME_PATTERN.test(name)) {
    return { name, error: 'Name contains invalid characters.' };
  }
  if (containsProfanity(name)) {
    return { name, error: 'That name is not allowed.' };
  }
  return { name, error: null };
}

/** Safely parses a JSON array column back out of D1 (never throws). */
export function parseArrayColumn(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Maps a raw `players` table row into the client-facing snapshot shape. */
export function playerRowToSnapshot(row) {
  return {
    username: row.username,
    coins: row.coins,
    boatsOwned: parseArrayColumn(row.boats_owned, ['starter']),
    boatEquipped: row.boat_equipped || 'starter',
    obstaclesOwned: parseArrayColumn(row.obstacles_owned, ['iceberg']),
    levelsUnlocked: row.levels_unlocked,
    levelsCompleted: parseArrayColumn(row.levels_completed, []),
    banned: Boolean(row.banned),
    updatedAt: row.updated_at
  };
}

/** SHA-256 hash of a PIN, hex-encoded. Uses the Workers runtime's Web Crypto API. */
export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Logs an admin action for the activity feed. Best-effort — never throws. */
export async function logAdminAction(env, action, target, detail) {
  try {
    await env.DB.prepare('INSERT INTO admin_actions (action, target, detail) VALUES (?, ?, ?)')
      .bind(action, target || null, detail || null)
      .run();
  } catch {
    // Logging failures shouldn't ever break the actual admin action.
  }
}
