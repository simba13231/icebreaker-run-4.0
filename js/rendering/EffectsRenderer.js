// EffectsRenderer.js
// Manages and draws all particle effects (splashes, wake, collision burst)
// using a simple object pool to minimize allocations on mobile devices.

import { CONFIG } from '../config.js';
import { Particle } from '../entities/Particle.js';

export class EffectsRenderer {
  constructor() {
    this.pool = [];
    this.active = [];
    this.reducedEffects = false;
    for (let i = 0; i < CONFIG.PARTICLES.MAX_PARTICLES; i++) {
      this.pool.push(new Particle());
    }
  }

  setReducedEffects(enabled) {
    this.reducedEffects = enabled;
  }

  _spawnParticle(x, y, vx, vy, life, color, size) {
    const p = this.pool.pop();
    if (!p) return; // pool exhausted — silently skip, keeps perf bounded
    p.reset(x, y, vx, vy, life, color, size);
    this.active.push(p);
  }

  emitSplash(x, y, direction = 0) {
    const count = this.reducedEffects
      ? Math.ceil(CONFIG.PARTICLES.SPLASH_COUNT / 2)
      : CONFIG.PARTICLES.SPLASH_COUNT;
    for (let i = 0; i < count; i++) {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 1.6 + direction * 0.3;
      const speed = 60 + Math.random() * 90;
      this._spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.35 + Math.random() * 0.25,
        Math.random() > 0.5 ? CONFIG.COLORS.ICE_LIGHT : CONFIG.COLORS.WATER_HIGHLIGHT_2,
        2 + Math.random() * 2.5
      );
    }
  }

  emitWake(x, y) {
    if (this.reducedEffects && Math.random() > 0.4) return;
    this._spawnParticle(
      x + (Math.random() - 0.5) * 14,
      y + 20,
      (Math.random() - 0.5) * 20,
      40 + Math.random() * 20,
      0.4,
      CONFIG.COLORS.WATER_HIGHLIGHT_2,
      2 + Math.random() * 2
    );
  }

  emitCollision(x, y) {
    const count = this.reducedEffects
      ? Math.ceil(CONFIG.PARTICLES.COLLISION_COUNT / 2)
      : CONFIG.PARTICLES.COLLISION_COUNT;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      this._spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.5 + Math.random() * 0.4,
        Math.random() > 0.5 ? CONFIG.COLORS.ICE_LIGHT : CONFIG.COLORS.DANGER,
        2.5 + Math.random() * 3.5
      );
    }
  }

  /** Icy "shattering shield" burst used when a dodge-ability boat absorbs a hit. */
  emitDodge(x, y) {
    const count = this.reducedEffects
      ? Math.ceil(CONFIG.PARTICLES.DODGE_COUNT / 2)
      : CONFIG.PARTICLES.DODGE_COUNT;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this._spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.4 + Math.random() * 0.3,
        Math.random() > 0.4 ? CONFIG.COLORS.ACCENT : CONFIG.COLORS.ICE_LIGHT,
        2 + Math.random() * 3
      );
    }
  }

  update(deltaSec) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.update(deltaSec);
      if (!p.active) {
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  render(ctx) {
    ctx.save();
    for (const p of this.active) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    for (const p of this.active) {
      p.active = false;
      this.pool.push(p);
    }
    this.active = [];
  }
}
