// Boat.js
// The player's boat. Logical position is always a lane index (0, 1, 2).
// Visual position smoothly interpolates toward the target lane's x coordinate.

import { CONFIG } from '../config.js';
import { getHitbox } from '../game/Collision.js';

export class Boat {
  constructor(lanePositions, startLane) {
    this.laneIndex = startLane;
    this.lanePositions = lanePositions;
    this.x = lanePositions[startLane];
    this.targetX = this.x;
    this.y = 0; // set by Game on resize
    this.width = CONFIG.BOAT.WIDTH;
    this.height = CONFIG.BOAT.HEIGHT;

    this.tilt = 0; // current tilt in degrees
    this._moveStartX = this.x;
    this._moveElapsed = CONFIG.BOAT.LANE_CHANGE_DURATION_MS; // start "not moving"
    this._moveDuration = CONFIG.BOAT.LANE_CHANGE_DURATION_MS;
    this._moveDir = 0; // -1 left, 1 right, 0 none

    this.wakeAccumulatorMs = 0;
  }

  setLanePositions(lanePositions) {
    this.lanePositions = lanePositions;
    this.targetX = lanePositions[this.laneIndex];
    if (this._moveElapsed >= this._moveDuration) {
      this.x = this.targetX;
    }
  }

  setY(y) {
    this.y = y;
  }

  /** Attempt to move one lane in the given direction (-1 or 1). */
  moveLane(direction) {
    const newLane = this.laneIndex + direction;
    if (newLane < 0 || newLane >= this.lanePositions.length) return false;
    this.laneIndex = newLane;
    this._moveStartX = this.x;
    this.targetX = this.lanePositions[this.laneIndex];
    this._moveElapsed = 0;
    this._moveDuration = CONFIG.BOAT.LANE_CHANGE_DURATION_MS;
    this._moveDir = direction;
    return true;
  }

  update(deltaMs, emitSplash) {
    // Interpolate lane movement
    if (this._moveElapsed < this._moveDuration) {
      this._moveElapsed = Math.min(this._moveElapsed + deltaMs, this._moveDuration);
      const t = this._moveElapsed / this._moveDuration;
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.x = this._moveStartX + (this.targetX - this._moveStartX) * eased;

      // Tilt toward movement direction, peaking mid-transition
      const tiltShape = Math.sin(t * Math.PI); // 0 -> 1 -> 0
      this.tilt = -this._moveDir * CONFIG.BOAT.MAX_TILT_DEG * tiltShape;

      if (t >= 1) {
        this.x = this.targetX;
        this.tilt = 0;
        if (emitSplash) emitSplash(this.x, this.y, this._moveDir);
      }
    } else {
      this.tilt = 0;
    }

    // Continuous wake particles while moving forward
    this.wakeAccumulatorMs += deltaMs;
  }

  getHitbox() {
    return getHitbox(this.x, this.y, this.width, this.height, CONFIG.BOAT.HITBOX_SHRINK);
  }
}
