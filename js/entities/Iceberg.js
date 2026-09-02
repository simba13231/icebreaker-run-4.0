// Iceberg.js
// A single iceberg obstacle. Procedurally shaped (no external art), moves
// downward at the current difficulty speed, and exposes a fair hitbox.

import { CONFIG } from '../config.js';
import { getHitbox } from '../game/Collision.js';

let nextId = 1;

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Generates a random-ish but consistent polygon "cap" for an iceberg silhouette. */
function generateShape(width, height) {
  const points = [];
  const peaks = 5 + Math.floor(Math.random() * 3); // 5-7 points around the top
  for (let i = 0; i <= peaks; i++) {
    const t = i / peaks;
    const x = -width / 2 + t * width;
    const jitter = randRange(0.08, 0.32) * height;
    const y = -height / 2 + jitter * (i % 2 === 0 ? 1 : 0.5);
    points.push({ x, y });
  }
  return points;
}

export class Iceberg {
  constructor(laneIndex, x, y) {
    this.id = nextId++;
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;

    const scale = randRange(0.85, 1.15);
    this.width = randRange(CONFIG.ICEBERG.MIN_WIDTH, CONFIG.ICEBERG.MAX_WIDTH) * scale;
    this.height = randRange(CONFIG.ICEBERG.MIN_HEIGHT, CONFIG.ICEBERG.MAX_HEIGHT) * scale;
    this.rotation = randRange(-CONFIG.ICEBERG.MAX_ROTATION_DEG, CONFIG.ICEBERG.MAX_ROTATION_DEG);
    this.shape = generateShape(this.width, this.height);
    this.shadeSeed = Math.random();
    this.markedForRemoval = false;
  }

  update(deltaSec, speed) {
    this.y += speed * deltaSec;
  }

  isOffscreen(canvasHeight) {
    return this.y - this.height > canvasHeight + 40;
  }

  getHitbox() {
    return getHitbox(this.x, this.y, this.width, this.height, CONFIG.ICEBERG.HITBOX_SHRINK);
  }
}
