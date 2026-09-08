# Icebreaker Run — Leaderboard, Accounts & Codes Worker

A Cloudflare Worker + D1 backend for:
- the global leaderboard
- player accounts (coins/boats/obstacles/levels, synced across sessions)
- redeem codes
- an admin API for managing all of the above (used by `../../admin/index.html`)

## Accounts — how they work (read this first)

There's no password/login system. The player's chosen **username is the
account key**. The first time a device registers a username, the server
creates a row seeded from that device's current local progress. From then
on:

- On load, the game pulls the server's copy of that username's progress and
  applies it locally — this is how an admin grant or reset actually reaches
  a player.
- At checkpoints (purchases, game over, level complete, race finish), the
  game pushes its current local progress up to the server.

Tradeoff: if two people pick the exact same username, they share one
account. Good enough for a hobby game with friends; not meant to survive
someone deliberately impersonating another player's name.

## Deploy / update steps

From this folder (`workers/leaderboard/`):

**First-time setup:**

```
wrangler d1 create icebreaker-leaderboard
wrangler d1 execute icebreaker-leaderboard --remote --file=./schema.sql
```

Copy the printed `database_id` into `wrangler.toml`.

**Adding accounts + codes (this update):**

```
wrangler d1 execute icebreaker-leaderboard --remote --file=./migrations/0002_accounts_and_codes.sql
```

**Set the admin secret** (pick your own long random string — this is the
key you'll type into the admin panel):

```
wrangler secret put ADMIN_KEY
```

**Deploy:**

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

`CloudLeaderboardService` and `AccountSync` (both in `js/systems/`) pick
this up automatically — no other code changes needed.

## Using the admin panel

Open `admin/index.html` (once it's deployed alongside the game — it's a
normal static page, just not linked from the game's menu) and enter the
`ADMIN_KEY` you set above. From there you can:

- **Grant** coins/a boat/an obstacle to any username — works even before
  that person has ever opened the game, so you can pre-load a gift for a
  friend.
- **Reset** a player back to defaults (coins, boats, obstacles, levels),
  optionally clearing their leaderboard scores too.
- **Create/delete redeem codes** — coins + an optional single item reward,
  with optional max-uses and an optional expiry date.
- **Moderate the leaderboard** — delete individual score entries.

The panel itself is reachable by anyone who finds the URL, but every admin
action requires the correct `X-Admin-Key` header, checked server-side — so
keep the key itself private, not the URL.

## API reference

**Public — leaderboard**
- `GET /api/scores?limit=50` → `{ scores: [{ name, score, created_at }] }`
- `POST /api/scores` `{ name, score }` → `{ ok, rank }`

**Public — accounts**
- `POST /api/players/register` `{ username, initialState }` → `{ ok, player }`
- `GET /api/players/:username/progress` → `{ player }`
- `POST /api/players/:username/progress` `{ coins, boatsOwned, boatEquipped, obstaclesOwned, levelsUnlocked, levelsCompleted }` → `{ ok }`

**Public — codes**
- `POST /api/codes/redeem` `{ username, code }` → `{ ok, coinsAwarded, itemUnlocked, player }`

**Admin — requires header `X-Admin-Key: <ADMIN_KEY>`**
- `GET /api/admin/players?search=` → `{ players }`
- `POST /api/admin/players/:username/grant` `{ coins?, boatId?, obstacleId? }` → `{ ok, player }`
- `POST /api/admin/players/:username/reset` `{ clearScores? }` → `{ ok }`
- `GET /api/admin/leaderboard?limit=200` → `{ scores }`
- `DELETE /api/admin/leaderboard/:id` → `{ ok }`
- `GET /api/admin/codes` → `{ codes }`
- `POST /api/admin/codes` `{ code, coinsReward, itemType, itemId, maxUses, expiresAt }` → `{ ok }`
- `DELETE /api/admin/codes/:code` → `{ ok }`

All usernames (both leaderboard names and account registration) are
validated server-side against the same character rules and profanity
blocklist as the client (`src/profanity-list.js`) — the client-side check
is only for instant feedback and can always be bypassed by calling the API
directly. Score submissions are also lightly rate-limited per IP.

## Local testing

```
wrangler dev
```

Point `API_BASE_URL` (in `js/config.js` and in `admin/index.html`) at the
printed local URL (e.g. `http://localhost:8787`) temporarily while testing.
