// OceanRenderer.js
// Draws the animated, scrolling icy-ocean background: gradient, moving
// water streaks, subtle foam, and lane guide lines.

import { CONFIG } from '../config.js';

export class OceanRenderer {
  constructor() {
    this.scrollY = 0;
    this.streaks = [];
  }

  init(width, height) {
    this.streaks = [];
    const count = Math.floor((width * height) / 26000);
    for (let i = 0; i < count; i++) {
      this.streaks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: 30 + Math.random() * 70,
        speed: 0.4 + Math.random() * 0.8,
        opacity: 0.05 + Math.random() * 0.12
      });
    }
  }

  update(deltaSec, speedFactor, height) {
    this.scrollY += deltaSec * 40 * speedFactor;
    for (const s of this.streaks) {
      s.y += s.speed * speedFactor * 60 * deltaSec;
      if (s.y - s.length > height) {
        s.y = -s.length;
        s.x = Math.random() * 1; // reassigned below with actual width in render
      }
    }
  }

  render(ctx, width, height, lanePositions, laneWidth) {
    const c = CONFIG.COLORS;

    // Base gradient — deep icy ocean.
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, c.OCEAN_DEEP);
    gradient.addColorStop(0.55, c.OCEAN_MID);
    gradient.addColorStop(1, c.OCEAN_LIGHT);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Faint lane dividers for readability.
    ctx.save();
    ctx.strokeStyle = 'rgba(78, 208, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 18]);
    ctx.lineDashOffset = -this.scrollY;
    for (let i = 1; i < lanePositions.length; i++) {
      const x = (lanePositions[i - 1] + lanePositions[i]) / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();

    // Water streaks (parallax movement).
    ctx.save();
    for (const s of this.streaks) {
      if (s.x > width) s.x = Math.random() * width;
      ctx.strokeStyle = `rgba(59, 167, 201, ${s.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y - s.length);
      ctx.stroke();
    }
    ctx.restore();

    // Subtle animated foam bands.
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = c.WATER_HIGHLIGHT_2;
    const bandSpacing = 160;
    const offset = this.scrollY % bandSpacing;
    for (let y = -bandSpacing + offset; y < height + bandSpacing; y += bandSpacing) {
      ctx.beginPath();
      ctx.ellipse(width / 2, y, width * 0.6, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
