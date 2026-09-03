// Hazard.js
// Generalizes the original Iceberg entity to cover every kind of "thing in a
// lane the player must dodge": the classic iceberg, purchasable obstacle
// skins (data/Obstacles.js), and oncoming rival boats in Endless mode.
//
// All kinds share the exact same movement/hitbox/fairness contract as the
// original Iceberg (see systems/Spawner.js), so nothing about the fairness
// algorithm changes — only appearance and damage value differ per kind.

import { CONFIG } from '../config.js';
import { getHitbox } from '../game/Collision.js';

let nextId = 1;

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Generates a random-ish but consistent polygon "cap" silhouette. */
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

export class Hazard {
  /**
   * @param {number} laneIndex
   * @param {number} x
   * @param {number} y
   * @param {object} obstacleDef - entry from data/Obstacles.js (kind, damage, ratios), or null for a default iceberg
   * @param {boolean} isBoat - true for an oncoming rival boat hazard
   */
  constructor(laneIndex, x, y, obstacleDef = null, isBoat = false) {
    this.id = nextId++;
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;
    this.isBoat = isBoat;
    this.kind = isBoat ? 'boat' : (obstacleDef ? obstacleDef.kind : 'iceberg');
    this.damage = isBoat
      ? CONFIG.ONCOMING_BOATS.DAMAGE
      : (obstacleDef ? obstacleDef.damage : CONFIG.SURVIVAL.DEFAULT_OBSTACLE_DAMAGE);

    const scale = randRange(0.85, 1.15);
    const widthRatio = obstacleDef && obstacleDef.widthRatio ? obstacleDef.widthRatio : 1;
    const heightRatio = obstacleDef && obstacleDef.heightRatio ? obstacleDef.heightRatio : 1;

    if (isBoat) {
      this.width = CONFIG.BOAT.WIDTH * randRange(0.95, 1.1);
      this.height = CONFIG.BOAT.HEIGHT * randRange(0.95, 1.1);
    } else {
      this.width = randRange(CONFIG.ICEBERG.MIN_WIDTH, CONFIG.ICEBERG.MAX_WIDTH) * scale * widthRatio;
      this.height = randRange(CONFIG.ICEBERG.MIN_HEIGHT, CONFIG.ICEBERG.MAX_HEIGHT) * scale * heightRatio;
    }

    this.rotation = isBoat
      ? 0
      : randRange(-CONFIG.ICEBERG.MAX_ROTATION_DEG, CONFIG.ICEBERG.MAX_ROTATION_DEG);
    this.shape = generateShape(this.width, this.height);
    this.shadeSeed = Math.random();
    this.markedForRemoval = false;
  }

  update(deltaSec, speed) {
    const speedMultiplier = this.isBoat ? CONFIG.ONCOMING_BOATS.SPEED_MULTIPLIER : 1;
    this.y += speed * speedMultiplier * deltaSec;
  }

  isOffscreen(canvasHeight) {
    return this.y - this.height > canvasHeight + 40;
  }

  getHitbox() {
    return getHitbox(this.x, this.y, this.width, this.height, CONFIG.ICEBERG.HITBOX_SHRINK);
  }
}
