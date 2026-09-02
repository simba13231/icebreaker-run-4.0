# Icebreaker Run

A polished 2D endless arcade boat-dodging game built with plain HTML5,
CSS3, and vanilla JavaScript (ES Modules) — no game engine, no
frameworks, no build step. Runs entirely in the browser and deploys as a
static site.

Steer a small boat across **three vertical lanes**, dodging icebergs that
drift down from the top of the screen. Survive as long as you can — speed
and obstacle density ramp up gradually the longer you last.

## Features

- Vertical, mobile-first endless runner with exactly 3 lanes
- Smooth, animated lane changes with boat tilt and water splash particles
- Procedurally drawn boat and icebergs (no external art/sprites)
- Fairness-guaranteed obstacle generation — a safe path always exists
- Gradual, interpolated difficulty ramp (no unfair spikes)
- Keyboard controls (arrows / A-D) and swipe + on-screen touch controls
- Procedural sound effects via the Web Audio API (no audio files, fully
  optional, never autoplays before interaction)
- Local high score + settings persistence via `localStorage`, with
  graceful fallback if storage is unavailable
- Centralized game-state machine (Menu, Playing, Paused, Game Over,
  Settings)
- Responsive layout for phones, tablets, desktop, and landscape
- Respects `prefers-reduced-motion`; includes an in-game "Reduced Effects"
  toggle
- Ready to deploy to Cloudflare Pages as-is

## Project Structure

```
icebreaker-run/
├── index.html
├── README.md
├── _headers
├── _redirects
│
├── css/
│   ├── variables.css     Design tokens (colors, spacing, easing)
│   ├── base.css           Reset + canvas/layout basics
│   ├── ui.css              HUD, menus, buttons, settings, touch controls
│   └── responsive.css   Breakpoints for phone/tablet/desktop/landscape
│
├── js/
│   ├── main.js               Boots the game
│   ├── config.js             Central tunable configuration
│   │
│   ├── game/
│   │   ├── Game.js            Top-level orchestrator
│   │   ├── GameLoop.js        requestAnimationFrame loop, delta time
│   │   ├── GameState.js       State machine (Menu/Playing/Paused/...)
│   │   ├── Difficulty.js      Smooth difficulty ramp
│   │   └── Collision.js       Pure collision detection
│   │
│   ├── entities/
│   │   ├── Boat.js            Player boat (lane logic, tilt, movement)
│   │   ├── Iceberg.js         Obstacle entity, procedural shape
│   │   └── Particle.js        Single particle (used via pooling)
│   │
│   ├── systems/
│   │   ├── Spawner.js         Obstacle timing + fairness algorithm
│   │   ├── InputManager.js    Keyboard, swipe, touch-button input
│   │   ├── AudioManager.js    Web Audio API sound effects
│   │   ├── ScoreManager.js    All scoring logic
│   │   └── StorageManager.js  localStorage wrapper + leaderboard service
│   │
│   ├── rendering/
│   │   ├── Renderer.js         Coordinates all canvas drawing
│   │   ├── OceanRenderer.js    Animated ocean background
│   │   └── EffectsRenderer.js  Particle pool + rendering
│   │
│   └── ui/
│       └── UIManager.js       DOM overlay management (menu/HUD/etc.)
│
├── assets/
│   └── audio/                (empty — all audio is generated at runtime)
│
└── workers/
    └── README.md             Notes on a future optional backend
```

## Local Development

No build step is required. Serve the folder with any static file server,
for example:

```bash
npx serve .
```

or:

```bash
python3 -m http.server 8080
```

Then open the printed local URL (e.g. `http://localhost:3000` or
`http://localhost:8080`) in your browser. Because the game uses ES
Modules, it must be served over HTTP(S) — opening `index.html` directly
via `file://` will not work in most browsers.

## Cloudflare Pages Deployment

1. Push this project to a GitHub repository.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
3. Open **Workers & Pages** in the sidebar.
4. Click **Create application → Pages → Connect to Git**.
5. Select your repository.
6. Configure the build settings:
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/`
7. Click **Save and Deploy**.

This is a static HTML/CSS/JS project — Cloudflare Pages will publish the
files as-is with no build step. `_headers` and `_redirects` are already
included with sensible defaults.

## Controls

**Desktop**

- `←` / `A` — move left one lane
- `→` / `D` — move right one lane
- `Esc` — pause / resume

**Mobile / Touch**

- Swipe left / right — move one lane
- On-screen `◀` `▶` buttons (toggleable in Settings)

## Settings

- Sound Effects on/off
- Background Music on/off
- Touch Controls on/off (show/hide the on-screen buttons)
- Reduced Effects (fewer particles, for lower-end devices or motion
  sensitivity)

All settings and your high score are saved locally in your browser.

## Architecture Overview

The codebase is split into clear responsibilities so no single file
becomes a monolith:

- **`game/`** — orchestration, state, difficulty curve, and pure
  collision math. `Game.js` is the only place that wires everything
  together.
- **`entities/`** — data + per-entity update logic for the boat, icebergs,
  and particles. Entities do not know how to draw themselves; rendering
  lives separately.
- **`systems/`** — cross-cutting concerns: input, audio, scoring,
  persistence, and obstacle spawning/fairness.
- **`rendering/`** — everything that touches the Canvas 2D context.
- **`ui/`** — everything that touches the DOM overlays.

This separation means, for example, the Spawner's fairness algorithm can
be unit-tested independently of Canvas rendering, and the rendering style
can be reskinned without touching gameplay logic.

### Fairness algorithm (obstacle generation)

Documented in detail in `js/systems/Spawner.js`. In short: every
generated obstacle row is checked against the set of lanes reachable from
the player's last known safe lane (at most one lane change away). A
candidate pattern is only accepted if it leaves at least one reachable
lane open — patterns that would block all lanes, or require the player to
"teleport" two lanes in one row, are rejected and regenerated.

## Future Backend Expansion

Version 1 requires no backend at all. `js/systems/StorageManager.js`
already exposes a small `LeaderboardService`-shaped interface
(`LocalLeaderboardService`) so a future `CloudLeaderboardService` — backed
by a Cloudflare Worker and D1 database — could be swapped in with no
changes to gameplay code. See `workers/README.md` for details and a
suggested schema.

## Performance Notes

- Uses `requestAnimationFrame` with delta-time updates; large deltas
  (e.g. after switching browser tabs) are clamped to avoid physics jumps.
- The tab auto-pauses when it becomes hidden, so players never lose
  because the tab was backgrounded.
- Particle effects use a fixed-size object pool (`EffectsRenderer.js`) to
  avoid per-frame allocations.
- Off-screen icebergs are removed every frame to bound memory/CPU use.
- Device pixel ratio is capped (`Math.min(devicePixelRatio, 2)`) to avoid
  over-rendering on very high-DPI phones.
- A "Reduced Effects" setting further lowers particle counts for
  lower-end devices.

## License / Assets

All visuals (boat, icebergs, UI) are drawn procedurally with Canvas/CSS.
All audio is synthesized at runtime with the Web Audio API. No external
or copyrighted assets are used.
