// ScoreManager.js
// Owns all scoring logic. Nothing else in the codebase should compute score.

import { CONFIG } from '../config.js';

export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.distancePx = 0;
    this._distanceAccumulator = 0;
  }

  /** Call every frame with deltaSec and the current fall speed (px/sec). */
  update(deltaSec, speed) {
    this.score += CONFIG.SCORE.POINTS_PER_SECOND * deltaSec;

    const distanceThisFrame = speed * deltaSec;
    this.distancePx += distanceThisFrame;
    this._distanceAccumulator += distanceThisFrame;

    while (this._distanceAccumulator >= 100) {
      this.score += CONFIG.SCORE.POINTS_PER_100PX_DISTANCE;
      this._distanceAccumulator -= 100;
    }
  }

  get displayScore() {
    return Math.floor(this.score);
  }

  static format(score) {
    return Math.floor(score).toLocaleString('en-US');
  }
}
