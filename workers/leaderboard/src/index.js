// index.js — Icebreaker Run global leaderboard Worker.
//
// Routes:
//   GET  /api/scores?limit=50   -> { scores: [{ name, score, created_at }, ...] }
//   POST /api/scores            -> body { name, score } -> { ok: true, rank }
//
// Backed by a D1 database (binding: DB). See ../schema.sql for the table
// definition and ../README.md for setup/deploy steps.

import { containsProfanity } from './profanity-list.js';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 16;
const NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;
const MAX_SCORE = 999999;
const MIN_SUBMIT_INTERVAL_MS = 3000; // simple per-IP throttle against spam submissions

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

async function handleGetScores(url, env) {
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 50;

  const { results } = await env.DB.prepare(
    'SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?'
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

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const score = Number(body.score);

  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    return json({ error: `Name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters.` }, 400);
  }
  if (!NAME_PATTERN.test(name)) {
    return json({ error: 'Name contains invalid characters.' }, 400);
  }
  if (containsProfanity(name)) {
    return json({ error: 'That name is not allowed.' }, 400);
  }
  if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: 'Invalid score.' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Basic anti-spam: reject if this IP submitted a score very recently.
  // (Not airtight — IPs can be shared/rotated — but stops naive spam without
  // needing an extra KV/Durable Object binding.)
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

  await env.DB.prepare('INSERT INTO scores (name, score, ip) VALUES (?, ?, ?)').bind(name, score, ip).run();

  const higher = await env.DB.prepare('SELECT COUNT(*) AS higherCount FROM scores WHERE score > ?')
    .bind(score)
    .first();
  const rank = (higher ? higher.higherCount : 0) + 1;

  return json({ ok: true, rank });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/api/scores' && request.method === 'GET') {
      return handleGetScores(url, env);
    }

    if (url.pathname === '/api/scores' && request.method === 'POST') {
      return handlePostScore(request, env);
    }

    return json({ error: 'Not found.' }, 404);
  }
};
