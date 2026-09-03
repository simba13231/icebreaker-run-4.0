# Future Backend (Not Required for v1)

Icebreaker Run v1 is a fully static site — no backend, no build step, no
secrets. This folder is a placeholder documenting how a backend *could* be
added later without reworking the game.

## Why a backend at all?

The only thing v1 lacks that a backend would enable is a **global**
leaderboard (today's high score is local to each browser via
`localStorage`).

## Suggested architecture

```
LeaderboardService              (interface used by the game)
├── LocalLeaderboardService     (implemented today — js/systems/StorageManager.js)
└── CloudLeaderboardService     (future)
```

`CloudLeaderboardService` would implement the same two methods the game
already calls on `LocalLeaderboardService`:

- `getHighScore(): number`
- `submitScore(score): { isNewRecord: boolean, highScore: number }`

Because the game only ever talks to a `LeaderboardService`-shaped object
(duck typing — see `js/game/Game.js`), swapping the implementation is a
one-line change with zero impact on rendering, input, or gameplay code.

## Suggested Cloudflare stack

- **Cloudflare Workers** — a small API with two routes:
  - `GET /api/highscore` → returns the current global top score(s)
  - `POST /api/score` → accepts `{ name, score }` and stores it
- **Cloudflare D1** — a SQLite-compatible database for a `scores` table:
  ```sql
  CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  ```
- Basic rate limiting / validation in the Worker to prevent obviously
  spoofed scores (e.g. reject scores that increase impossibly fast for the
  time elapsed).

## Other future ideas noted for later

- Player usernames (stored client-side, sent with each score submission)
- Daily challenge seeds (a shared random seed for the Spawner so everyone
  faces the same obstacle sequence for the day)
- Cosmetic boat skins unlocked by score milestones

None of this is required to run or deploy v1 — it's here purely so a
future contributor knows where the extension points are.
