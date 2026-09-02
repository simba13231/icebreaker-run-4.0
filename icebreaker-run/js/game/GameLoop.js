// GameLoop.js
// A clean requestAnimationFrame loop with delta-time clamping. Gameplay and
// rendering are delegated to callbacks so this file stays purely about timing.

import { CONFIG } from '../config.js';

export class GameLoop {
  constructor({ update, render }) {
    this._update = update;
    this._render = render;
    this._rafId = null;
    this._lastTime = null;
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick(now) {
    if (!this._running) return;
    let deltaMs = now - this._lastTime;
    this._lastTime = now;

    // Clamp large deltas (e.g. after switching tabs) to avoid huge jumps.
    deltaMs = Math.min(deltaMs, CONFIG.GAME.MAX_DELTA_MS);

    this._update(deltaMs);
    this._render();

    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }
}
