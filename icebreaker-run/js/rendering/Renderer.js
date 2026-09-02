// Renderer.js
// Coordinates all canvas rendering: ocean background, entities (boat,
// icebergs), and effects. Keeps drawing logic separate from gameplay state.

import { CONFIG } from '../config.js';
import { OceanRenderer } from './OceanRenderer.js';
import { EffectsRenderer } from './EffectsRenderer.js';

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ocean = new OceanRenderer();
    this.effects = new EffectsRenderer();
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this._clockSec = 0;
  }

  resize(cssWidth, cssHeight) {
    this.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.RENDER.MAX_DPR);
    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = cssWidth;
    this.height = cssHeight;
    this.ocean.init(cssWidth, cssHeight);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  renderOcean(deltaSec, speedFactor, lanePositions, laneWidth) {
    this.ocean.update(deltaSec, speedFactor, this.height);
    this.ocean.render(this.ctx, this.width, this.height, lanePositions, laneWidth);
  }

  renderBoat(boat) {
    this._clockSec += 0; // reserved for future boat-level animation timing
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(boat.x, boat.y);
    ctx.rotate(toRad(boat.tilt));

    const w = boat.width;
    const h = boat.height;
    const c = CONFIG.COLORS;
    const skin = (boat.boatDef && boat.boatDef.colors) || {
      hull: c.BOAT_HULL,
      hullShade: c.BOAT_HULL_SHADE,
      cabin: c.BOAT_CABIN
    };

    // Invincibility shield glow, drawn behind the hull.
    if (boat.isInvincible) {
      const pulse = 0.55 + 0.25 * Math.sin(performance.now() / 90);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = c.ACCENT;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.72, h * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillStyle = c.ACCENT;
      ctx.fill();
      ctx.restore();
    }

    // Wake trail behind the boat.
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = c.WATER_HIGHLIGHT_2;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.55, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hull (rounded polygon).
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w / 2, -h / 2 + h * 0.15, w / 2, h / 3, w * 0.32, h / 2);
    ctx.lineTo(-w * 0.32, h / 2);
    ctx.bezierCurveTo(-w / 2, h / 3, -w / 2, -h / 2 + h * 0.15, 0, -h / 2);
    ctx.closePath();
    const hullGradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    hullGradient.addColorStop(0, skin.hullShade);
    hullGradient.addColorStop(0.5, skin.hull);
    hullGradient.addColorStop(1, skin.hullShade);
    ctx.fillStyle = hullGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cabin/cockpit.
    ctx.beginPath();
    ctx.roundRect(-w * 0.22, -h * 0.12, w * 0.44, h * 0.34, 6);
    ctx.fillStyle = skin.cabin;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cabin highlight/window.
    ctx.beginPath();
    ctx.roundRect(-w * 0.14, -h * 0.05, w * 0.28, h * 0.12, 3);
    ctx.fillStyle = c.ACCENT;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bow highlight.
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w * 0.08, -h / 2 + h * 0.18);
    ctx.lineTo(-w * 0.08, -h / 2 + h * 0.18);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    // Icebreaker skin gets a reinforced, spiked prow for a distinct silhouette.
    if (boat.boatDef && boat.boatDef.special === 'reinforcedProw') {
      ctx.beginPath();
      ctx.moveTo(-w * 0.16, -h / 2 + h * 0.1);
      ctx.lineTo(0, -h / 2 - h * 0.18);
      ctx.lineTo(w * 0.16, -h / 2 + h * 0.1);
      ctx.closePath();
      ctx.fillStyle = c.ICE_LIGHT;
      ctx.strokeStyle = 'rgba(11, 61, 92, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  renderIceberg(iceberg) {
    const ctx = this.ctx;
    const c = CONFIG.COLORS;
    ctx.save();
    ctx.translate(iceberg.x, iceberg.y);
    ctx.rotate(toRad(iceberg.rotation));

    ctx.beginPath();
    const pts = iceberg.shape;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(iceberg.width / 2, iceberg.height / 2);
    ctx.lineTo(-iceberg.width / 2, iceberg.height / 2);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, -iceberg.height / 2, 0, iceberg.height / 2);
    grad.addColorStop(0, c.ICE_LIGHT);
    grad.addColorStop(0.5 + iceberg.shadeSeed * 0.2, c.ICE_MID);
    grad.addColorStop(1, c.ICE_DARK);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(11, 61, 92, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle facet highlight.
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[Math.floor(pts.length / 2)].x, pts[Math.floor(pts.length / 2)].y);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  renderEffects(deltaSec) {
    this.effects.update(deltaSec);
    this.effects.render(this.ctx);
  }
}
