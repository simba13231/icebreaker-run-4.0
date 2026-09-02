// Difficulty.js
// Two modes:
//   - Endless: smooth continuous ramp (as before) PLUS discrete milestone
//     steps every CONFIG.DIFFICULTY.MILESTONE_SCORE_STEP points, so the
//     game keeps getting harder indefinitely rather than plateauing once
//     the continuous ramp finishes at RAMP_TIME_SEC.
//   - Level: fixed base speed/spawn/pattern-complexity determined by the
//     level's own config (see data/Levels.js), with a smaller in-level ramp
//     layered on top so each level still has some live escalation.

import { CONFIG } from '../config.js';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export class Difficulty {
  constructor() {
    this.mode = 'endless';
    this._levelConfig = null;
    this.reset();
  }

  /** Switch to endless mode (continuous ramp + score milestones). */
  configureEndless() {
    this.mode = 'endless';
    this._levelConfig = null;
    this.reset();
  }

  /** Switch to level mode using a fixed base difficulty from data/Levels.js. */
  configureForLevel(levelConfig) {
    this.mode = 'level';
    this._levelConfig = levelConfig;
    this.reset();
  }

  reset() {
    this.elapsedSec = 0;
    this.milestoneTier = 0;
    if (this.mode === 'level' && this._levelConfig) {
      this.speed = this._levelConfig.baseSpeed;
      this.spawnInterval = this._levelConfig.baseSpawnInterval;
    } else {
      this.speed = CONFIG.DIFFICULTY.INITIAL_SPEED;
      this.spawnInterval = CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL;
    }
  }

  /** Called every frame with deltaSec. */
  update(deltaSec) {
    this.elapsedSec += deltaSec;
    if (this.mode === 'level') {
      this._updateLevel();
    } else {
      this._updateEndless();
    }
  }

  /** Called once per frame (endless mode only) with the current display score. */
  updateFromScore(score) {
    if (this.mode !== 'endless') return;
    this.milestoneTier = Math.floor(score / CONFIG.DIFFICULTY.MILESTONE_SCORE_STEP);
  }

  _updateEndless() {
    const rampT = Math.min(this.elapsedSec / CONFIG.DIFFICULTY.RAMP_TIME_SEC, 1);
    const eased = easeOutCubic(rampT);

    const speedRange = CONFIG.DIFFICULTY.MAX_SPEED - CONFIG.DIFFICULTY.INITIAL_SPEED;
    const rampedSpeed = CONFIG.DIFFICULTY.INITIAL_SPEED + speedRange * eased;

    const intervalRange =
      CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL - CONFIG.DIFFICULTY.MIN_SPAWN_INTERVAL;
    const rampedInterval = CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL - intervalRange * eased;

    const tier = this.milestoneTier;
    this.speed = rampedSpeed * (1 + tier * CONFIG.DIFFICULTY.MILESTONE_SPEED_BONUS);
    const withMilestone =
      rampedInterval * (1 - tier * CONFIG.DIFFICULTY.MILESTONE_SPAWN_REDUCTION);
    this.spawnInterval = Math.max(withMilestone, CONFIG.DIFFICULTY.MILESTONE_SPAWN_FLOOR);
  }

  _updateLevel() {
    const cfg = this._levelConfig;
    const rampT = Math.min(this.elapsedSec / CONFIG.LEVELS.IN_LEVEL_RAMP_TIME_SEC, 1);
    const eased = easeOutCubic(rampT);
    const headroom = CONFIG.LEVELS.IN_LEVEL_SPEED_HEADROOM;

    this.speed = cfg.baseSpeed * (1 + headroom * eased);
    const intervalFloor = Math.max(cfg.baseSpawnInterval * 0.82, CONFIG.DIFFICULTY.MIN_SPAWN_INTERVAL);
    this.spawnInterval = cfg.baseSpawnInterval - (cfg.baseSpawnInterval - intervalFloor) * eased;
  }

  /** Returns a 0..1+ difficulty tier used by the Spawner to unlock pattern complexity. */
  get tierProgress() {
    if (this.mode === 'level' && this._levelConfig) {
      const rampT = Math.min(this.elapsedSec / CONFIG.LEVELS.IN_LEVEL_RAMP_TIME_SEC, 1);
      return Math.min(1, this._levelConfig.baseTierProgress + rampT * 0.15);
    }
    const rampProgress = Math.min(this.elapsedSec / CONFIG.DIFFICULTY.RAMP_TIME_SEC, 1);
    return rampProgress + this.milestoneTier * CONFIG.DIFFICULTY.MILESTONE_TIER_PROGRESS_BONUS;
  }
}
