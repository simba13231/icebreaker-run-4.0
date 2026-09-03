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

  // --- Generalized hazard rendering (iceberg + purchasable obstacle skins + oncoming boats) ---

  renderHazard(hazard) {
    if (hazard.isBoat) {
      this._renderHazardBoat(hazard);
      return;
    }
    switch (hazard.kind) {
      case 'mine':
        this._renderMine(hazard);
        break;
      case 'log':
        this._renderLog(hazard);
        break;
      case 'buoy':
        this._renderBuoy(hazard);
        break;
      case 'barricade':
        this._renderBarricade(hazard);
        break;
      case 'net':
        this._renderNet(hazard);
        break;
      case 'barrel':
        this._renderBarrel(hazard);
        break;
      case 'iceberg':
      default:
        this.renderIceberg(hazard);
        break;
    }
  }

  _renderMine(hazard) {
    const ctx = this.ctx;
    const r = Math.min(hazard.width, hazard.height) / 2;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);

    // Pulsing warning ring.
    const pulse = 0.4 + 0.3 * Math.sin(performance.now() / 140);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = CONFIG.COLORS.DANGER;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Spikes.
    ctx.fillStyle = '#2B2E36';
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(-r * 0.12, -r * 1.15);
      ctx.lineTo(r * 0.12, -r * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Body.
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#4A4E58');
    grad.addColorStop(1, '#1A1C22');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = CONFIG.COLORS.DANGER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  _renderLog(hazard) {
    const ctx = this.ctx;
    const w = hazard.width;
    const h = hazard.height;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate((hazard.rotation * Math.PI) / 180);

    const bodyPath = new Path2D();
    bodyPath.roundRect(-w / 2, -h / 2, w, h, h * 0.45);

    // Bark body — warmer, more saturated tones than the old muddy gradient,
    // with a lighter highlight running along the top edge like sunlight.
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#C99459');
    grad.addColorStop(0.35, '#A9713F');
    grad.addColorStop(1, '#6E4526');
    ctx.fillStyle = grad;
    ctx.fill(bodyPath);
    ctx.strokeStyle = 'rgba(50, 30, 14, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke(bodyPath);

    // Diagonal bark grooves for texture, clipped to the log body.
    ctx.save();
    ctx.clip(bodyPath);
    ctx.strokeStyle = 'rgba(40, 24, 10, 0.35)';
    ctx.lineWidth = Math.max(1, h * 0.05);
    const grooveSpacing = h * 0.32;
    for (let x = -w / 2 - h; x < w / 2 + h; x += grooveSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, -h / 2);
      ctx.lineTo(x + h * 0.5, h / 2);
      ctx.stroke();
    }
    ctx.restore();

    // Cut end-caps: concentric tree rings at each tip, giving it a
    // recognizable "sawn log" silhouette instead of a flat brown pill.
    ctx.strokeStyle = 'rgba(255, 236, 205, 0.55)';
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i += 2) {
      const cx = i * w * 0.4;
      const capGrad = ctx.createRadialGradient(cx, 0, 1, cx, 0, h * 0.42);
      capGrad.addColorStop(0, '#F1D9A8');
      capGrad.addColorStop(0.55, '#D9AE73');
      capGrad.addColorStop(1, '#8A5A2E');
      ctx.beginPath();
      ctx.ellipse(cx, 0, h * 0.17, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = capGrad;
      ctx.fill();
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(cx, 0, (h * 0.17 * ring) / 3.4, (h * 0.42 * ring) / 3.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _renderBuoy(hazard) {
    const ctx = this.ctx;
    const r = Math.min(hazard.width, hazard.height) / 2;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red stripes.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = CONFIG.COLORS.DANGER;
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * r * 0.5 - r * 0.12, -r, r * 0.24, r * 2);
    }
    ctx.restore();

    // Small flag pole.
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, -r * 1.6);
    ctx.stroke();
    ctx.fillStyle = CONFIG.COLORS.ACCENT_WARM;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.6);
    ctx.lineTo(r * 0.5, -r * 1.42);
    ctx.lineTo(0, -r * 1.24);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _renderBarricade(hazard) {
    const ctx = this.ctx;
    const w = hazard.width;
    const h = hazard.height;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate((hazard.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.save();
    ctx.clip();
    const stripeW = h * 0.42;
    let flip = 0;
    for (let x = -w / 2 - h; x < w / 2 + h; x += stripeW) {
      ctx.fillStyle = flip % 2 === 0 ? '#FFC93C' : '#26282E';
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(Math.PI / 5);
      ctx.fillRect(-stripeW, -h, stripeW, h * 3);
      ctx.restore();
      flip++;
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.stroke();

    ctx.restore();
  }

  _renderNet(hazard) {
    const ctx = this.ctx;
    const w = hazard.width;
    const h = hazard.height;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);

    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.fillStyle = CONFIG.COLORS.OCEAN_MID;
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    const step = 12;
    for (let x = -w / 2; x <= w / 2; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -h / 2);
      ctx.lineTo(x, h / 2);
      ctx.stroke();
    }
    for (let y = -h / 2; y <= h / 2; y += step) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(4, 30, 54, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.stroke();

    ctx.restore();
  }

  _renderBarrel(hazard) {
    const ctx = this.ctx;
    const w = hazard.width;
    const h = hazard.height;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate((hazard.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.3);
    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, '#8A5A2B');
    grad.addColorStop(0.5, '#C97F3B');
    grad.addColorStop(1, '#8A5A2B');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 38, 18, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Metal bands.
    ctx.fillStyle = 'rgba(40, 30, 20, 0.55)';
    ctx.fillRect(-w / 2, -h * 0.32, w, h * 0.1);
    ctx.fillRect(-w / 2, h * 0.22, w, h * 0.1);

    ctx.restore();
  }

  /** Oncoming rival boat hazard (Endless mode) — a small hull silhouette in a warning color. */
  _renderHazardBoat(hazard) {
    const ctx = this.ctx;
    const w = hazard.width;
    const h = hazard.height;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate(Math.PI); // approaching boats face "down" toward the player

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w / 2, -h / 2 + h * 0.15, w / 2, h / 3, w * 0.32, h / 2);
    ctx.lineTo(-w * 0.32, h / 2);
    ctx.bezierCurveTo(-w / 2, h / 3, -w / 2, -h / 2 + h * 0.15, 0, -h / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, '#7A1F1F');
    grad.addColorStop(0.5, CONFIG.COLORS.DANGER);
    grad.addColorStop(1, '#7A1F1F');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-w * 0.2, -h * 0.1, w * 0.4, h * 0.3, 5);
    ctx.fillStyle = '#2B2E36';
    ctx.fill();

    ctx.restore();
  }

  // --- Pickups: coins and power-ups ---

  renderCoin(coin) {
    const ctx = this.ctx;
    const t = performance.now() / 260 + coin._spinSeed;
    const squash = Math.abs(Math.cos(t)); // fake a spinning coin via horizontal squash
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.scale(Math.max(0.25, squash), 1);

    const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, coin.size / 2);
    grad.addColorStop(0, '#FFF6D9');
    grad.addColorStop(1, CONFIG.COLORS.GOLD);
    ctx.beginPath();
    ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#C98A00';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  renderPowerUp(powerUp) {
    const ctx = this.ctx;
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 220);
    ctx.save();
    ctx.translate(powerUp.x, powerUp.y);
    ctx.scale(pulse, pulse);

    ctx.beginPath();
    ctx.arc(0, 0, powerUp.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = powerUp.typeDef.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = powerUp.typeDef.color;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = `${powerUp.size * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(powerUp.typeDef.icon, 0, 1);

    ctx.restore();
  }

  // --- Race Mode: bot rivals ---

  renderBot(bot, y) {
    const ctx = this.ctx;
    const w = CONFIG.BOAT.WIDTH * 0.9;
    const h = CONFIG.BOAT.HEIGHT * 0.9;
    ctx.save();
    ctx.translate(bot.x, y);

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w / 2, -h / 2 + h * 0.15, w / 2, h / 3, w * 0.32, h / 2);
    ctx.lineTo(-w * 0.32, h / 2);
    ctx.bezierCurveTo(-w / 2, h / 3, -w / 2, -h / 2 + h * 0.15, 0, -h / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, bot.colors.hullShade);
    grad.addColorStop(0.5, bot.colors.hull);
    grad.addColorStop(1, bot.colors.hullShade);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-w * 0.22, -h * 0.12, w * 0.44, h * 0.34, 6);
    ctx.fillStyle = bot.colors.cabin;
    ctx.fill();

    ctx.restore();

    // Name tag.
    ctx.save();
    ctx.font = '600 10px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8, 38, 58, 0.65)';
    ctx.fillText(bot.name, bot.x, y - h / 2 - 6);
    ctx.restore();
  }
}
