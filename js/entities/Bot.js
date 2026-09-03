// Bot.js
// A rival boat for Race Mode. Bots don't move through 2D space independently
// — like the player, a bot lives in one of the three lanes and its vertical
// screen position is derived from how far ahead/behind its race PROGRESS
// (px along the race distance) is relative to the player's progress. This
// keeps bots fully compatible with the existing lane/scroll architecture.
//
// Bots pick a lane like the player (via RaceManager's obstacle look-ahead)
// and interpolate toward it the same way the player boat does.

import { CONFIG } from '../config.js';

export class Bot {
  constructor(id, name, lanePositions, startLane, speedMultiplier, colors) {
    this.id = id;
    this.name = name;
    this.lanePositions = lanePositions;
    this.laneIndex = startLane;
    this.x = lanePositions[startLane];
    this.targetX = this.x;
    this._moveElapsed = CONFIG.BOAT.LANE_CHANGE_DURATION_MS;
    this._moveDuration = CONFIG.BOAT.LANE_CHANGE_DURATION_MS;
    this.colors = colors;

    this.progress = 0; // px along the race distance
    this.speedMultiplier = speedMultiplier;
    this.finished = false;
    this.finishOrder = null;
    this._dodgeCooldownMs = 0;
    this._slowMsRemaining = 0;
    this._slowFactor = 1;
  }

  setLanePositions(lanePositions) {
    this.lanePositions = lanePositions;
    this.targetX = lanePositions[this.laneIndex];
  }

  /** Attempts to steer into an adjacent open lane to avoid a blocked one. */
  tryDodge(blockedLanes) {
    if (this._dodgeCooldownMs > 0) return;
    if (!blockedLanes || !blockedLanes.has(this.laneIndex)) return;
    const candidates = [this.laneIndex - 1, this.laneIndex + 1].filter(
      (l) => l >= 0 && l < this.lanePositions.length && !blockedLanes.has(l)
    );
    if (candidates.length === 0) return;
    const newLane = candidates[Math.floor(Math.random() * candidates.length)];
    this.laneIndex = newLane;
    this.targetX = this.lanePositions[newLane];
    this._moveElapsed = 0;
    this._moveDuration = CONFIG.BOAT.LANE_CHANGE_DURATION_MS;
    this._dodgeCooldownMs = 400;
  }

  /** Called when the bot fails to dodge a blocked lane — temporary speed penalty. */
  applyHitSlowdown(durationMs, factor) {
    this._slowMsRemaining = durationMs;
    this._slowFactor = factor;
  }

  /** Current speed multiplier from an active hit-slowdown (1 = no penalty). */
  get slowFactor() {
    return this._slowMsRemaining > 0 ? this._slowFactor : 1;
  }

  update(deltaMs, progressDeltaPx) {
    this.progress += progressDeltaPx;

    if (this._dodgeCooldownMs > 0) this._dodgeCooldownMs = Math.max(0, this._dodgeCooldownMs - deltaMs);
    if (this._slowMsRemaining > 0) this._slowMsRemaining = Math.max(0, this._slowMsRemaining - deltaMs);

    if (this._moveElapsed < this._moveDuration) {
      this._moveElapsed = Math.min(this._moveElapsed + deltaMs, this._moveDuration);
      const t = this._moveElapsed / this._moveDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      const startX = this.x;
      this.x = startX + (this.targetX - startX) * eased;
      if (t >= 1) this.x = this.targetX;
    }
  }
}
