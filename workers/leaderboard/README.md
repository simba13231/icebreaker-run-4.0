# Icebreaker Run — Leaderboard Worker

A small Cloudflare Worker + D1 backend for the global leaderboard. See
`../README.md` for the original design notes — this folder is the actual
implementation.

## Deploy steps

From this folder (`workers/leaderboard/`):

```
wrangler d1 create icebreaker-leaderboard
```

This prints a `database_id` — copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_DATABASE_ID`.

Create the `scores` table:

```
wrangler d1 execute icebreaker-leaderboard --file=./schema.sql
```

Deploy the Worker:

```
wrangler deploy
```

This prints a live URL, e.g. `https://icebreaker-leaderboard.<you>.workers.dev`.

## Wire it up to the game

Copy that URL into `js/config.js`:

```js
LEADERBOARD: {
  API_BASE_URL: 'https://icebreaker-leaderboard.<you>.workers.dev',
  ...
}
```

That's the only change needed — `CloudLeaderboardService` (in
`js/systems/StorageManager.js`) picks it up automatically. Until this is
set, the Leaderboard screen in the game just shows "not set up yet" and
score submission silently no-ops — nothing else in the game depends on it.

## API

- `GET /api/scores?limit=50` → `{ scores: [{ name, score, created_at }, ...] }`,
  sorted by score descending.
- `POST /api/scores` with JSON body `{ name, score }` → `{ ok: true, rank }`
  on success, or `{ error: "..." }` with a 4xx status on validation failure.

Both the username's character set and a profanity blocklist are enforced
server-side (`src/profanity-list.js`) regardless of what the client already
checked, since the client check can always be bypassed by calling this API
directly. Score submissions are also lightly rate-limited per IP.

## Local testing

```
wrangler dev
```

Then point `API_BASE_URL` at the printed local URL (e.g.
`http://localhost:8787`) temporarily while testing.
