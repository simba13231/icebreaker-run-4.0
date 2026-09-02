// Particle.js
// Lightweight particle used for splashes, wake, and collision effects.
// Designed to be reused via an object pool (see EffectsRenderer) to avoid
// excessive allocation on lower-end mobile devices.

export class Particle {
  constructor() {
    this.reset(0, 0, 0, 0, 0, '#ffffff', 0);
  }

  reset(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.active = true;
    return this;
  }

  update(deltaSec) {
    if (!this.active) return;
    this.x += this.vx * deltaSec;
    this.y += this.vy * deltaSec;
    this.vy += 40 * deltaSec; // slight gravity/drag toward water
    this.vx *= 0.98;
    this.life -= deltaSec;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}
