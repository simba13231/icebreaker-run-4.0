// Difficulty.js
// Smoothly ramps iceberg speed and spawn frequency based on survival time.
// Uses interpolation (not step jumps) so the player never feels a sudden spike.

import { CONFIG } from '../config.js';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export class Difficulty {
  constructor() {
    this.reset();
  }

  reset() {
    this.elapsedSec = 0;
    this.speed = CONFIG.DIFFICULTY.INITIAL_SPEED;
    this.spawnInterval = CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL;
  }

  update(deltaSec) {
    this.elapsedSec += deltaSec;

    const rampT = Math.min(this.elapsedSec / CONFIG.DIFFICULTY.RAMP_TIME_SEC, 1);
    const eased = easeOutCubic(rampT);

    const speedRange = CONFIG.DIFFICULTY.MAX_SPEED - CONFIG.DIFFICULTY.INITIAL_SPEED;
    this.speed = CONFIG.DIFFICULTY.INITIAL_SPEED + speedRange * eased;

    const intervalRange =
      CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL - CONFIG.DIFFICULTY.MIN_SPAWN_INTERVAL;
    this.spawnInterval =
      CONFIG.DIFFICULTY.INITIAL_SPAWN_INTERVAL - intervalRange * eased;
  }

  /** Returns a 0..1 difficulty tier used by the Spawner to unlock pattern complexity. */
  get tierProgress() {
    return Math.min(this.elapsedSec / CONFIG.DIFFICULTY.RAMP_TIME_SEC, 1);
  }
}
