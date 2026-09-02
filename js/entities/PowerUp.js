// PowerUp.js
// A timed-buff (or instant-effect) pickup. Like Coin, always spawned in an
// open lane so it's never a trap — picking one up is always the player's
// choice and always a net positive.

import { getHitbox } from '../game/Collision.js';

const SIZE = 34;
const HITBOX_SHRINK = 1.25;

let nextId = 1;

export class PowerUp {
  constructor(laneIndex, x, y, typeDef) {
    this.id = nextId++;
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;
    this.size = SIZE;
    this.typeDef = typeDef; // entry from data/PowerUps.js
    this.markedForRemoval = false;
    this.collected = false;
  }

  update(deltaSec, speed) {
    this.y += speed * deltaSec;
  }

  isOffscreen(canvasHeight) {
    return this.y - this.size > canvasHeight + 40;
  }

  getHitbox() {
    return getHitbox(this.x, this.y, this.size, this.size, HITBOX_SHRINK);
  }
}
