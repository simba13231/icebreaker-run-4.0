// PowerUpManager.js
// Owns power-up spawn timing and active-buff timers. Game.js asks this for a
// new PowerUp entity when appropriate and calls activate()/isActive() to
// apply effects elsewhere (Boat, ScoreManager, Progression). Kept separate
// from Spawner.js because power-ups are pickups (always safe to grab), not
// hazards subject to the lane-fairness algorithm.

import { CONFIG } from '../config.js';
import { PowerUp } from '../entities/PowerUp.js';
import { getPowerUpTypesForMode } from '../data/PowerUps.js';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class PowerUpManager {
  constructor() {
    this.reset();
  }

  reset() {
    this._timeSinceSpawnMs = 0;
    this._nextSpawnMs = randRange(
      CONFIG.POWERUPS.MIN_SPAWN_INTERVAL_MS,
      CONFIG.POWERUPS.MAX_SPAWN_INTERVAL_MS
    );
    this.active = new Map(); // typeId -> remainingMs
  }

  /** Decays active buff timers. Call every frame during play. */
  update(deltaMs) {
    for (const [typeId, remaining] of this.active) {
      const next = remaining - deltaMs;
      if (next <= 0) this.active.delete(typeId);
      else this.active.set(typeId, next);
    }
  }

  /** Returns a new PowerUp entity to spawn this frame, or null. */
  maybeSpawn(deltaMs, mode, lanePositions, spawnY) {
    this._timeSinceSpawnMs += deltaMs;
    if (this._timeSinceSpawnMs < this._nextSpawnMs) return null;
    this._timeSinceSpawnMs = 0;
    this._nextSpawnMs = randRange(
      CONFIG.POWERUPS.MIN_SPAWN_INTERVAL_MS,
      CONFIG.POWERUPS.MAX_SPAWN_INTERVAL_MS
    );

    const types = getPowerUpTypesForMode(mode);
    if (types.length === 0) return null;
    const typeDef = types[Math.floor(Math.random() * types.length)];
    const laneIndex = Math.floor(Math.random() * lanePositions.length);
    return new PowerUp(laneIndex, lanePositions[laneIndex], spawnY, typeDef);
  }

  /** Activates a timed buff (no-op duration = instant effect handled by caller). */
  activate(typeDef) {
    if (typeDef.durationMs > 0) {
      this.active.set(typeDef.id, typeDef.durationMs);
    }
  }

  isActive(typeId) {
    return this.active.has(typeId);
  }

  /** Ends an active buff immediately (e.g. Shield is consumed by absorbing one hit). */
  consume(typeId) {
    this.active.delete(typeId);
  }

  /** For HUD rendering: [{id, icon, label, remainingMs}] */
  getActiveList(allTypes) {
    const list = [];
    for (const [typeId, remainingMs] of this.active) {
      const def = allTypes.find((t) => t.id === typeId);
      if (def) list.push({ ...def, remainingMs });
    }
    return list;
  }
}
