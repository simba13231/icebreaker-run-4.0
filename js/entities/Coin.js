// Coin.js
// An in-run coin pickup. Always spawned in a lane that is open (never part
// of the current blocked-lane pattern), so it's purely a bonus to grab, never
// a hazard. Collected via Collision.checkPickups, not checkCollisions.

import { getHitbox } from '../game/Collision.js';

const SIZE = 26;
const HITBOX_SHRINK = 1.3; // generous — pickups should be forgiving, not punishing

let nextId = 1;

export class Coin {
  constructor(laneIndex, x, y) {
    this.id = nextId++;
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.size = SIZE;
    this.markedForRemoval = false;
    this.collected = false;
    this._spinSeed = Math.random() * Math.PI * 2;
  }

  update(deltaSec, speed) {
    this.y += speed * deltaSec;
  }

  /** Pulls the coin toward a magnet target (the boat) when magnet power-up is active. */
  attractToward(targetX, targetY, deltaSec, strength) {
    this.x += (targetX - this.x) * Math.min(1, strength * deltaSec);
    this.y += (targetY - this.y) * Math.min(1, strength * deltaSec);
  }

  isOffscreen(canvasHeight) {
    return this.y - this.size > canvasHeight + 40;
  }

  getHitbox() {
    return getHitbox(this.x, this.y, this.size, this.size, HITBOX_SHRINK);
  }
}
